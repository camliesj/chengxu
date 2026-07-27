package com.chengxu.autoservice.core.orders

import com.chengxu.autoservice.core.auth.AuthenticatedDataCleaner
import com.chengxu.autoservice.core.network.ConnectionState
import com.chengxu.autoservice.core.network.NetworkMonitor
import com.chengxu.autoservice.core.session.AppSession
import com.chengxu.autoservice.core.session.SessionRepository
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import java.util.UUID

data class InsurancePoliciesSnapshot(
    val companyId: String? = null,
    val records: List<InsurancePolicyRecord> = emptyList(),
    val syncState: OrderSyncState = OrderSyncState.LoadingCache,
    val writeState: InsuranceWriteState = InsuranceWriteState.Idle,
)

sealed interface InsuranceWriteState {
    data object Idle : InsuranceWriteState
    data object Saving : InsuranceWriteState
    data class Conflict(val latest: InsurancePolicyRecord?) : InsuranceWriteState
    data class Failed(val message: String) : InsuranceWriteState
}

interface InsurancePolicyCache : AuthenticatedDataCleaner {
    fun observePolicies(companyId: String): Flow<List<InsurancePolicyRecord>>
    suspend fun replacePolicies(companyId: String, records: List<InsurancePolicyRecord>)
}

interface InsurancePoliciesDataSource {
    val snapshot: StateFlow<InsurancePoliciesSnapshot>
    suspend fun refresh()
    suspend fun save(policy: InsurancePolicyRecord)
    suspend fun delete(id: String, expectedVersion: Int)
}

class InsurancePoliciesRepository(
    applicationScope: CoroutineScope,
    private val sessionRepository: SessionRepository,
    private val networkMonitor: NetworkMonitor,
    private val api: InsurancePoliciesApi,
    private val cache: InsurancePolicyCache,
    private val sessionInvalidator: SessionInvalidator,
) : InsurancePoliciesDataSource {
    private val mutableSnapshot = MutableStateFlow(InsurancePoliciesSnapshot())
    private val requestMutex = Mutex()
    @Volatile private var activeIdentity: InsuranceSessionIdentity? = null
    override val snapshot: StateFlow<InsurancePoliciesSnapshot> = mutableSnapshot.asStateFlow()

    init {
        applicationScope.launch {
            var previousIdentity: InsuranceSessionIdentity? = null
            sessionRepository.session.collectLatest { session ->
                val identity = session?.insuranceIdentity()
                if (previousIdentity != null && identity != null && previousIdentity != identity) cache.clear()
                previousIdentity = identity
                activeIdentity = identity
                mutableSnapshot.value = InsurancePoliciesSnapshot(companyId = session?.companyId)
                if (session == null) return@collectLatest
                launch { cache.observePolicies(session.companyId).collect { records ->
                    if (isCurrent(identity)) mutableSnapshot.update { state -> state.copy(
                        records = records,
                        syncState = if (state.syncState == OrderSyncState.LoadingCache) OrderSyncState.Ready else state.syncState,
                    ) }
                } }
                launch { networkMonitor.connection.collect { if (it == ConnectionState.Online) refresh() } }
            }
        }
    }

    override suspend fun refresh() {
        val session = sessionRepository.session.value ?: return
        if (networkMonitor.connection.value != ConnectionState.Online || !requestMutex.tryLock()) return
        val identity = session.insuranceIdentity()
        val prior = mutableSnapshot.value.syncState
        try {
            if (!isCurrent(identity)) return
            mutableSnapshot.update { it.copy(syncState = OrderSyncState.Refreshing) }
            when (val result = api.fetch(session.token)) {
                is InsurancePoliciesResult.Success -> if (result.records.any { it.companyId != session.companyId }) {
                    handleReadFailure(identity, OrdersFailure.MalformedResponse)
                } else {
                    cache.replacePolicies(session.companyId, result.records)
                    mutableSnapshot.update { it.copy(syncState = OrderSyncState.Ready) }
                }
                is InsurancePoliciesResult.Failure -> handleReadFailure(identity, result.reason)
            }
        } catch (cancelled: CancellationException) {
            if (isCurrent(identity)) mutableSnapshot.update { it.copy(syncState = prior) }
            throw cancelled
        } finally { requestMutex.unlock() }
    }

    override suspend fun save(policy: InsurancePolicyRecord) {
        val session = sessionRepository.session.value ?: return
        val identity = session.insuranceIdentity()
        if (!isCurrent(identity) || policy.companyId != session.companyId) return
        if (networkMonitor.connection.value != ConnectionState.Online) return writeFailure(OrdersFailure.NetworkUnavailable)
        mutableSnapshot.update { it.copy(writeState = InsuranceWriteState.Saving) }
        when (val result = api.save(session.token, UUID.randomUUID().toString(), policy.version.takeIf { it > 0 }, policy)) {
            is InsurancePolicyWriteResult.Success -> if (result.policy.companyId == session.companyId && isCurrent(identity)) {
                cache.replacePolicies(session.companyId, mutableSnapshot.value.records.filterNot { it.id == result.policy.id } + result.policy)
                mutableSnapshot.update { it.copy(writeState = InsuranceWriteState.Idle) }
            } else writeFailure(OrdersFailure.MalformedResponse)
            is InsurancePolicyWriteResult.Conflict -> mutableSnapshot.update { it.copy(writeState = InsuranceWriteState.Conflict(result.latest)) }
            is InsurancePolicyWriteResult.Deleted -> writeFailure(OrdersFailure.MalformedResponse)
            is InsurancePolicyWriteResult.Failure -> handleWriteFailure(result.reason)
        }
    }

    override suspend fun delete(id: String, expectedVersion: Int) {
        val session = sessionRepository.session.value ?: return
        val identity = session.insuranceIdentity()
        if (!isCurrent(identity) || id.isBlank() || expectedVersion < 1) return
        if (networkMonitor.connection.value != ConnectionState.Online) return writeFailure(OrdersFailure.NetworkUnavailable)
        mutableSnapshot.update { it.copy(writeState = InsuranceWriteState.Saving) }
        when (val result = api.delete(session.token, UUID.randomUUID().toString(), id, expectedVersion)) {
            is InsurancePolicyWriteResult.Deleted -> if (result.id == id && isCurrent(identity)) {
                cache.replacePolicies(session.companyId, mutableSnapshot.value.records.filterNot { it.id == id })
                mutableSnapshot.update { it.copy(writeState = InsuranceWriteState.Idle) }
            } else writeFailure(OrdersFailure.MalformedResponse)
            is InsurancePolicyWriteResult.Conflict -> mutableSnapshot.update { it.copy(writeState = InsuranceWriteState.Conflict(result.latest)) }
            is InsurancePolicyWriteResult.Success -> writeFailure(OrdersFailure.MalformedResponse)
            is InsurancePolicyWriteResult.Failure -> handleWriteFailure(result.reason)
        }
    }

    private suspend fun handleReadFailure(identity: InsuranceSessionIdentity, failure: OrdersFailure) {
        if (!isCurrent(identity)) return
        mutableSnapshot.update { it.copy(syncState = OrderSyncState.Stale(failure.insuranceMessage())) }
        if (failure == OrdersFailure.Unauthorized) { cache.clear(); sessionInvalidator.invalidate() }
    }

    private suspend fun handleWriteFailure(failure: OrdersFailure) {
        if (failure == OrdersFailure.Unauthorized) { cache.clear(); sessionInvalidator.invalidate() }
        writeFailure(failure)
    }
    private fun writeFailure(failure: OrdersFailure) = mutableSnapshot.update { it.copy(writeState = InsuranceWriteState.Failed(failure.insuranceMessage())) }
    private fun isCurrent(identity: InsuranceSessionIdentity?) = identity != null && activeIdentity == identity && sessionRepository.session.value?.insuranceIdentity() == identity
}

private data class InsuranceSessionIdentity(val companyId: String, val username: String, val token: String)
private fun AppSession.insuranceIdentity() = InsuranceSessionIdentity(companyId, username, token)
private fun OrdersFailure.insuranceMessage() = when (this) {
    OrdersFailure.NetworkUnavailable -> "网络不可用，保险档案当前为只读模式"
    OrdersFailure.ServerError -> "保险档案服务暂时不可用，请稍后重试"
    OrdersFailure.MalformedResponse -> "保险档案数据异常，请稍后重试"
    OrdersFailure.Unauthorized -> "登录已过期，请重新登录"
}
