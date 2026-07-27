package com.chengxu.autoservice.core.orders

import com.chengxu.autoservice.core.orders.model.OrderSummary

interface HistoryOrdersApi {
    suspend fun fetch(token: String, cursor: String?): HistoryOrdersResult
}

sealed interface HistoryOrdersResult {
    data class Success(
        val orders: List<OrderSummary>,
        val nextCursor: String?,
    ) : HistoryOrdersResult

    data class Failure(val reason: OrdersFailure) : HistoryOrdersResult
}
