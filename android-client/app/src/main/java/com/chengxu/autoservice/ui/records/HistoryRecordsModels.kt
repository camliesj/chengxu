package com.chengxu.autoservice.ui.records

import com.chengxu.autoservice.ui.orders.OrderDisplayModel

enum class HistoryTimeFilter(val label: String) {
    ALL("全部时间"),
    LAST_30_DAYS("近 30 天"),
    OLDER("更早记录"),
}

data class HistoryRecordsUiState(
    val loading: Boolean = true,
    val refreshing: Boolean = false,
    val loadingNextPage: Boolean = false,
    val syncMessage: String? = null,
    val showRetry: Boolean = false,
    val query: String = "",
    val timeFilter: HistoryTimeFilter = HistoryTimeFilter.ALL,
    val allOrders: List<OrderDisplayModel> = emptyList(),
    val visibleOrders: List<OrderDisplayModel> = emptyList(),
    val hasMore: Boolean = false,
) {
    val visibleCount: Int get() = visibleOrders.size
    val hasActiveFilters: Boolean get() = query.isNotBlank() || timeFilter != HistoryTimeFilter.ALL
}
