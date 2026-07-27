package com.chengxu.autoservice.core.orders

import com.chengxu.autoservice.core.auth.AuthenticatedDataCleaner
import com.chengxu.autoservice.core.network.ConnectionState
import com.chengxu.autoservice.core.network.NetworkMonitor
import com.chengxu.autoservice.core.orders.model.OrderSummary
import com.chengxu.autoservice.core.session.AppSession
import com.chengxu.autoservice.core.session.SessionRepository
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex

data class HistoryOrdersSnapshot(
    val orders: List<OrderSummary> = emptyList(),
    val nextCursor: String? = null,
    val syncState: OrderSyncState = OrderSyncState.LoadingCache,
    val loadingNextPage: Boolean = false,
)

interface HistoryOrderCache : AuthenticatedDataCleaner {
    fun observeHistory(companyId: String): Flow<List<OrderSummary>>
    suspend fun replaceHistory(companyId: String, orders: List<OrderSummary>)
    suspend fun appendHistory(companyId: String, orders: List<OrderSummary>)
}

interface HistoryOrdersDataSource {
    val snapshot: StateFlow<HistoryOrdersSnapshot>
    suspend fun refresh()
    suspend fun loadNextPage()
}

class HistoryOrdersRepository(
    applicationScope: CoroutineScope,
    private val sessionRepository: SessionRepository,
    private val networkMonitor: NetworkMonitor,
    private val historyOrdersApi: HistoryOrdersApi,
    private val historyOrderCache: HistoryOrderCache,
    private val sessionInvalidator: SessionInvalidator,
) : HistoryOrdersDataSource {
    private val mutableSnapshot = MutableStateFlow(HistoryOrdersSnapshot())
    private val requestMutex = Mutex()

    @Volatile
    private var activeIdentity: HistorySessionIdentity? = null

    override val snapshot: StateFlow<HistoryOrdersSnapshot> = mutableSnapshot.asStateFlow()

    init {
        applicationScope.launch {
            var previousIdentity: HistorySessionIdentity? = null
            sessionRepository.session.collectLatest { session ->
                val nextIdentity = session?.historyIdentity()
                if (previousIdentity != null && nextIdentity != null && previousIdentity != nextIdentity) {
                    historyOrderCache.clear()
                }
                previousIdentity = nextIdentity
                activeIdentity = nextIdentity
                mutableSnapshot.value = HistoryOrdersSnapshot()
                if (session == null) return@collectLatest

                coroutineScope {
                    launch {
                        historyOrderCache.observeHistory(session.companyId).collect { orders ->
                            if (activeIdentity == nextIdentity) {
                                mutableSnapshot.update { current ->
                                    current.copy(
                                        orders = orders,
                                        syncState = if (current.syncState == OrderSyncState.LoadingCache) {
                                            OrderSyncState.Ready
                                        } else {
                                            current.syncState
                                        },
                                    )
                                }
                            }
                        }
                    }
                    launch {
                        networkMonitor.connection.collect { connection ->
                            if (connection == ConnectionState.Online) refresh()
                        }
                    }
                }
            }
        }
    }

    override suspend fun refresh() = requestPage(cursor = null, replace = true)

    override suspend fun loadNextPage() {
        val cursor = mutableSnapshot.value.nextCursor ?: return
        requestPage(cursor = cursor, replace = false)
    }

    private suspend fun requestPage(cursor: String?, replace: Boolean) {
        val session = sessionRepository.session.value ?: return
        if (networkMonitor.connection.value != ConnectionState.Online) return
        if (!requestMutex.tryLock()) return

        val identity = session.historyIdentity()
        val previousSyncState = mutableSnapshot.value.syncState
        try {
            if (activeIdentity == null) activeIdentity = identity
            if (!isCurrent(identity)) return
            mutableSnapshot.update {
                if (replace) it.copy(syncState = OrderSyncState.Refreshing)
                else it.copy(loadingNextPage = true)
            }
            when (val result = historyOrdersApi.fetch(session.token, cursor)) {
                is HistoryOrdersResult.Success -> {
                    if (!isCurrent(identity)) return
                    if (result.orders.any { it.companyId != session.companyId || it.status != "已结算" }) {
                        handleFailure(identity, OrdersFailure.MalformedResponse)
                        return
                    }
                    if (replace) {
                        historyOrderCache.replaceHistory(session.companyId, result.orders)
                    } else {
                        historyOrderCache.appendHistory(session.companyId, result.orders)
                    }
                    mutableSnapshot.update {
                        it.copy(
                            nextCursor = result.nextCursor,
                            syncState = OrderSyncState.Ready,
                            loadingNextPage = false,
                        )
                    }
                }
                is HistoryOrdersResult.Failure -> handleFailure(identity, result.reason)
            }
        } catch (cancellation: CancellationException) {
            if (isCurrent(identity)) {
                mutableSnapshot.update {
                    it.copy(syncState = previousSyncState, loadingNextPage = false)
                }
            }
            throw cancellation
        } finally {
            requestMutex.unlock()
        }
    }

    private suspend fun handleFailure(identity: HistorySessionIdentity, failure: OrdersFailure) {
        if (!isCurrent(identity)) return
        mutableSnapshot.update { current ->
            current.copy(
                orders = if (failure == OrdersFailure.Unauthorized) emptyList() else current.orders,
                syncState = OrderSyncState.Stale(failure.historyMessage()),
                loadingNextPage = false,
            )
        }
        if (failure == OrdersFailure.Unauthorized) {
            historyOrderCache.clear()
            sessionInvalidator.invalidate()
        }
    }

    private fun isCurrent(identity: HistorySessionIdentity): Boolean =
        activeIdentity == identity && sessionRepository.session.value?.historyIdentity() == identity
}

private data class HistorySessionIdentity(val companyId: String, val username: String)

private fun AppSession.historyIdentity() = HistorySessionIdentity(companyId, username)

private fun OrdersFailure.historyMessage() = when (this) {
    OrdersFailure.NetworkUnavailable -> "网络异常，当前数据可能不是最新"
    OrdersFailure.ServerError -> "服务器暂时不可用，当前数据可能不是最新"
    OrdersFailure.MalformedResponse -> "历史档案数据异常，请稍后重试"
    OrdersFailure.Unauthorized -> "登录已过期，请重新登录"
}
