package com.chengxu.autoservice.core.orders

import com.chengxu.autoservice.core.auth.AuthenticatedDataCleaner
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.StateFlow

data class OrdersSnapshot(
    val orders: List<RepairOrder> = emptyList(),
    val syncState: OrderSyncState = OrderSyncState.LoadingCache,
)

sealed interface OrderSyncState {
    data object LoadingCache : OrderSyncState
    data object Ready : OrderSyncState
    data object Refreshing : OrderSyncState
    data class Stale(val message: String) : OrderSyncState
}

interface OrdersRepository {
    val snapshot: StateFlow<OrdersSnapshot>
    suspend fun refresh()
}

interface OrderCache : AuthenticatedDataCleaner {
    fun observe(companyId: String): Flow<List<RepairOrder>>
    suspend fun replace(companyId: String, orders: List<RepairOrder>)
}

fun interface SessionInvalidator {
    suspend fun invalidate()
}
