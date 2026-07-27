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

data class CustomerVehiclesSnapshot(
    val records: List<CustomerVehicleRecord> = emptyList(),
    val syncState: OrderSyncState = OrderSyncState.LoadingCache,
)

interface CustomerVehicleCache : AuthenticatedDataCleaner {
    fun observeVehicles(companyId: String): Flow<List<CustomerVehicleRecord>>
    suspend fun replaceVehicles(companyId: String, records: List<CustomerVehicleRecord>)
}

interface CustomerVehiclesDataSource {
    val snapshot: StateFlow<CustomerVehiclesSnapshot>
    suspend fun refresh()
}

class CustomerVehiclesRepository(
    applicationScope: CoroutineScope,
    private val sessionRepository: SessionRepository,
    private val networkMonitor: NetworkMonitor,
    private val customerVehiclesApi: CustomerVehiclesApi,
    private val customerVehicleCache: CustomerVehicleCache,
    private val sessionInvalidator: SessionInvalidator,
) : CustomerVehiclesDataSource {
    private val mutableSnapshot = MutableStateFlow(CustomerVehiclesSnapshot())
    private val requestMutex = Mutex()

    @Volatile private var activeIdentity: CustomerVehicleSessionIdentity? = null

    override val snapshot: StateFlow<CustomerVehiclesSnapshot> = mutableSnapshot.asStateFlow()

    init {
        applicationScope.launch {
            var previousIdentity: CustomerVehicleSessionIdentity? = null
            sessionRepository.session.collectLatest { session ->
                val nextIdentity = session?.customerVehicleIdentity()
                if (previousIdentity != null && nextIdentity != null && previousIdentity != nextIdentity) {
                    customerVehicleCache.clear()
                }
                previousIdentity = nextIdentity
                activeIdentity = nextIdentity
                mutableSnapshot.value = CustomerVehiclesSnapshot()
                if (session == null) return@collectLatest

                launch {
                    customerVehicleCache.observeVehicles(session.companyId).collect { records ->
                        if (activeIdentity == nextIdentity) {
                            mutableSnapshot.update { current -> current.copy(
                                records = records,
                                syncState = if (current.syncState == OrderSyncState.LoadingCache) OrderSyncState.Ready else current.syncState,
                            ) }
                        }
                    }
                }
                launch {
                    networkMonitor.connection.collect { if (it == ConnectionState.Online) refresh() }
                }
            }
        }
    }

    override suspend fun refresh() {
        val session = sessionRepository.session.value ?: return
        if (networkMonitor.connection.value != ConnectionState.Online || !requestMutex.tryLock()) return
        val identity = session.customerVehicleIdentity()
        val priorSync = mutableSnapshot.value.syncState
        try {
            if (!isCurrent(identity)) return
            mutableSnapshot.update { it.copy(syncState = OrderSyncState.Refreshing) }
            when (val result = customerVehiclesApi.fetch(session.token)) {
                is CustomerVehiclesResult.Success -> {
                    if (!isCurrent(identity)) return
                    if (result.records.any { it.companyId != session.companyId }) {
                        handleFailure(identity, OrdersFailure.MalformedResponse)
                    } else {
                        customerVehicleCache.replaceVehicles(session.companyId, result.records)
                        mutableSnapshot.update { it.copy(syncState = OrderSyncState.Ready) }
                    }
                }
                is CustomerVehiclesResult.Failure -> handleFailure(identity, result.reason)
            }
        } catch (cancelled: CancellationException) {
            if (isCurrent(identity)) mutableSnapshot.update { it.copy(syncState = priorSync) }
            throw cancelled
        } finally {
            requestMutex.unlock()
        }
    }

    private suspend fun handleFailure(identity: CustomerVehicleSessionIdentity, failure: OrdersFailure) {
        if (!isCurrent(identity)) return
        mutableSnapshot.update { current -> current.copy(
            records = if (failure == OrdersFailure.Unauthorized) emptyList() else current.records,
            syncState = OrderSyncState.Stale(failure.customerVehicleMessage()),
        ) }
        if (failure == OrdersFailure.Unauthorized) {
            customerVehicleCache.clear()
            sessionInvalidator.invalidate()
        }
    }

    private fun isCurrent(identity: CustomerVehicleSessionIdentity) =
        activeIdentity == identity && sessionRepository.session.value?.customerVehicleIdentity() == identity
}

private data class CustomerVehicleSessionIdentity(val companyId: String, val username: String)
private fun AppSession.customerVehicleIdentity() = CustomerVehicleSessionIdentity(companyId, username)
private fun OrdersFailure.customerVehicleMessage() = when (this) {
    OrdersFailure.NetworkUnavailable -> "网络异常，当前展示已缓存的车辆档案"
    OrdersFailure.ServerError -> "服务暂时不可用，当前展示已缓存的车辆档案"
    OrdersFailure.MalformedResponse -> "车辆档案数据异常，请稍后重试"
    OrdersFailure.Unauthorized -> "登录已过期，请重新登录"
}
