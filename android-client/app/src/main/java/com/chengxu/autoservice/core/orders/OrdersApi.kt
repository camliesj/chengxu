package com.chengxu.autoservice.core.orders

interface OrdersApi {
    suspend fun fetch(token: String): OrdersResult
}

sealed interface OrdersResult {
    data class Success(val orders: List<RepairOrder>) : OrdersResult
    data class Failure(val reason: OrdersFailure) : OrdersResult
}

enum class OrdersFailure {
    Unauthorized,
    NetworkUnavailable,
    ServerError,
    MalformedResponse,
}
