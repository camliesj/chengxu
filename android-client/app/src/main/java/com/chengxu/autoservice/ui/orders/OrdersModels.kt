package com.chengxu.autoservice.ui.orders

enum class OrderStatusFilter(
    val label: String,
    val status: String?,
) {
    ALL("全部", null),
    REPAIRING("在修中", "在修中"),
    COMPLETED("已完工", "已完工"),
    PENDING_SETTLEMENT("待结算", "待结算"),
    SETTLED("已结算", "已结算"),
}

enum class OrderStatusTone {
    PRIMARY,
    SUCCESS,
    WARNING,
    NEUTRAL,
}

data class OrderDisplayModel(
    val id: String,
    val plate: String,
    val customer: String,
    val car: String,
    val type: String,
    val status: String,
    val statusTone: OrderStatusTone,
    val serviceSummary: String,
    val record: String,
    val date: String,
    val time: String,
    val dateTimeLabel: String,
    val amountLabel: String,
    val insuranceExpiry: String,
    val delivery: String,
)

data class OrdersUiState(
    val loading: Boolean = true,
    val refreshing: Boolean = false,
    val syncMessage: String? = null,
    val showRetry: Boolean = false,
    val query: String = "",
    val selectedFilter: OrderStatusFilter = OrderStatusFilter.ALL,
    val allOrders: List<OrderDisplayModel> = emptyList(),
    val visibleOrders: List<OrderDisplayModel> = emptyList(),
) {
    val totalCount: Int get() = allOrders.size
    val visibleCount: Int get() = visibleOrders.size
    val hasActiveFilters: Boolean get() = query.isNotBlank() || selectedFilter != OrderStatusFilter.ALL
}
