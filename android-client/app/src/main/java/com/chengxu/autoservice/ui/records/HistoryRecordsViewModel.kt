package com.chengxu.autoservice.ui.records

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chengxu.autoservice.core.orders.HistoryOrdersDataSource
import com.chengxu.autoservice.core.orders.HistoryOrdersSnapshot
import com.chengxu.autoservice.core.orders.OrderSyncState
import com.chengxu.autoservice.core.orders.RepairOrder
import com.chengxu.autoservice.core.orders.model.OrderSummary
import com.chengxu.autoservice.ui.orders.OrderDisplayModel
import com.chengxu.autoservice.ui.orders.mapOrder
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.util.Locale

class HistoryRecordsViewModel(
    private val historyOrders: HistoryOrdersDataSource,
    private val today: () -> LocalDate = { LocalDate.now() },
) : ViewModel() {
    private val query = MutableStateFlow("")
    private val timeFilter = MutableStateFlow(HistoryTimeFilter.ALL)

    val uiState: StateFlow<HistoryRecordsUiState> = combine(
        historyOrders.snapshot,
        query,
        timeFilter,
    ) { snapshot, currentQuery, currentTimeFilter ->
        snapshot.toUiState(currentQuery, currentTimeFilter, today())
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.Eagerly,
        initialValue = HistoryRecordsUiState(),
    )

    fun updateQuery(value: String) {
        query.value = value
    }

    fun selectTimeFilter(value: HistoryTimeFilter) {
        timeFilter.value = value
    }

    fun clearFilters() {
        query.value = ""
        timeFilter.value = HistoryTimeFilter.ALL
    }

    fun refresh() {
        viewModelScope.launch { historyOrders.refresh() }
    }

    fun loadNextPage() {
        if (!uiState.value.hasMore || uiState.value.loadingNextPage) return
        viewModelScope.launch { historyOrders.loadNextPage() }
    }
}

private fun HistoryOrdersSnapshot.toUiState(
    query: String,
    timeFilter: HistoryTimeFilter,
    today: LocalDate,
): HistoryRecordsUiState {
    val allOrders = orders.map(OrderSummary::toDisplayModel)
    return HistoryRecordsUiState(
        loading = syncState == OrderSyncState.LoadingCache,
        refreshing = syncState == OrderSyncState.Refreshing,
        loadingNextPage = loadingNextPage,
        syncMessage = (syncState as? OrderSyncState.Stale)?.message,
        showRetry = syncState is OrderSyncState.Stale,
        query = query,
        timeFilter = timeFilter,
        allOrders = allOrders,
        visibleOrders = allOrders.filterHistory(query, timeFilter, today),
        hasMore = nextCursor != null,
    )
}

private fun OrderSummary.toDisplayModel(): OrderDisplayModel = mapOrder(
    RepairOrder(
        id = id,
        companyId = companyId,
        date = date,
        dateSortKey = dateSortKey,
        time = time,
        plate = plate,
        customer = customer,
        car = car,
        type = type,
        status = status,
        amountCents = amountCents,
        record = record,
        insuranceExpiry = insuranceExpiry,
        delivery = delivery,
    ),
)

private fun List<OrderDisplayModel>.filterHistory(
    query: String,
    timeFilter: HistoryTimeFilter,
    today: LocalDate,
): List<OrderDisplayModel> {
    val normalizedQuery = query.trim().lowercase(Locale.ROOT)
    val threshold = today.minusDays(30)
    return filter { order ->
        val date = runCatching { LocalDate.parse(order.date) }.getOrNull()
        val matchesTime = when (timeFilter) {
            HistoryTimeFilter.ALL -> true
            HistoryTimeFilter.LAST_30_DAYS -> date?.let { !it.isBefore(threshold) } == true
            HistoryTimeFilter.OLDER -> date?.isBefore(threshold) == true
        }
        val matchesQuery = normalizedQuery.isEmpty() || listOf(
            order.id,
            order.plate,
            order.customer,
            order.car,
            order.record,
        ).any { it.lowercase(Locale.ROOT).contains(normalizedQuery) }
        matchesTime && matchesQuery
    }
}
