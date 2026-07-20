package com.chengxu.autoservice.ui.orders

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chengxu.autoservice.core.orders.OrderSyncState
import com.chengxu.autoservice.core.orders.OrdersRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class OrdersViewModel(
    private val ordersRepository: OrdersRepository,
) : ViewModel() {
    private val query = MutableStateFlow("")
    private val selectedFilter = MutableStateFlow(OrderStatusFilter.ALL)

    val uiState: StateFlow<OrdersUiState> = combine(
        ordersRepository.snapshot,
        query,
        selectedFilter,
    ) { snapshot, currentQuery, currentFilter ->
        val allOrders = snapshot.orders.map(::mapOrder)
        OrdersUiState(
            loading = snapshot.syncState == OrderSyncState.LoadingCache,
            refreshing = snapshot.syncState == OrderSyncState.Refreshing,
            syncMessage = (snapshot.syncState as? OrderSyncState.Stale)?.message,
            showRetry = snapshot.syncState is OrderSyncState.Stale,
            query = currentQuery,
            selectedFilter = currentFilter,
            allOrders = allOrders,
            visibleOrders = filterOrders(allOrders, currentQuery, currentFilter),
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.Eagerly,
        initialValue = OrdersUiState(),
    )

    fun updateQuery(value: String) {
        query.value = value
    }

    fun selectFilter(value: OrderStatusFilter) {
        selectedFilter.value = value
    }

    fun clearFilters() {
        query.value = ""
        selectedFilter.value = OrderStatusFilter.ALL
    }

    fun refresh() {
        viewModelScope.launch { ordersRepository.refresh() }
    }
}
