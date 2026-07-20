package com.chengxu.autoservice.core.orders

import com.chengxu.autoservice.core.network.ConnectionState
import com.chengxu.autoservice.core.network.NetworkMonitor
import com.chengxu.autoservice.core.session.AppSession
import com.chengxu.autoservice.core.session.SessionRepository
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex

class CachedOrdersRepository(
    applicationScope: CoroutineScope,
    private val sessionRepository: SessionRepository,
    private val networkMonitor: NetworkMonitor,
    private val ordersApi: OrdersApi,
    private val orderCache: OrderCache,
    private val sessionInvalidator: SessionInvalidator,
) : OrdersRepository {
    private val mutableSnapshot = MutableStateFlow(OrdersSnapshot())
    private val refreshMutex = Mutex()

    @Volatile
    private var activeIdentity: SessionIdentity? = null

    override val snapshot: StateFlow<OrdersSnapshot> = mutableSnapshot.asStateFlow()

    init {
        applicationScope.launch {
            var previousIdentity: SessionIdentity? = null
            sessionRepository.session.collectLatest { session ->
                val nextIdentity = session?.identity()
                if (previousIdentity != null && nextIdentity != null && previousIdentity != nextIdentity) {
                    orderCache.clear()
                }
                previousIdentity = nextIdentity
                activeIdentity = nextIdentity
                mutableSnapshot.value = OrdersSnapshot()
                if (session == null) return@collectLatest

                coroutineScope {
                    launch {
                        orderCache.observe(session.companyId).collect { orders ->
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

    override suspend fun refresh() {
        val session = sessionRepository.session.value ?: return
        if (networkMonitor.connection.value != ConnectionState.Online) return
        if (!refreshMutex.tryLock()) return

        val identity = session.identity()
        val previousSyncState = mutableSnapshot.value.syncState
        try {
            if (activeIdentity == null) activeIdentity = identity
            if (activeIdentity != identity) return
            mutableSnapshot.update { it.copy(syncState = OrderSyncState.Refreshing) }

            when (val result = ordersApi.fetch(session.token)) {
                is OrdersResult.Success -> {
                    if (!isCurrent(identity)) return
                    orderCache.replace(session.companyId, result.orders)
                    mutableSnapshot.update { it.copy(syncState = OrderSyncState.Ready) }
                }
                is OrdersResult.Failure -> handleFailure(identity, result.reason)
            }
        } catch (cancellation: CancellationException) {
            if (isCurrent(identity)) {
                mutableSnapshot.update { it.copy(syncState = previousSyncState) }
            }
            throw cancellation
        } finally {
            refreshMutex.unlock()
        }
    }

    private suspend fun handleFailure(identity: SessionIdentity, failure: OrdersFailure) {
        if (!isCurrent(identity)) return
        mutableSnapshot.update { current ->
            current.copy(
                orders = if (failure == OrdersFailure.Unauthorized) emptyList() else current.orders,
                syncState = OrderSyncState.Stale(failure.message()),
            )
        }
        if (failure == OrdersFailure.Unauthorized) {
            orderCache.clear()
            sessionInvalidator.invalidate()
        }
    }

    private fun isCurrent(identity: SessionIdentity): Boolean =
        activeIdentity == identity && sessionRepository.session.value?.identity() == identity
}

private data class SessionIdentity(val companyId: String, val username: String)

private fun AppSession.identity() = SessionIdentity(companyId = companyId, username = username)

private fun OrdersFailure.message() = when (this) {
    OrdersFailure.NetworkUnavailable -> "网络异常，当前数据可能不是最新"
    OrdersFailure.ServerError -> "服务器暂时不可用，当前数据可能不是最新"
    OrdersFailure.MalformedResponse -> "工单数据异常，请稍后重试"
    OrdersFailure.Unauthorized -> "登录已过期，请重新登录"
}
