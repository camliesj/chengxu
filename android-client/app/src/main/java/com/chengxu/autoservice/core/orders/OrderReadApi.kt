package com.chengxu.autoservice.core.orders

import com.chengxu.autoservice.core.orders.model.OrderDetail
import com.chengxu.autoservice.core.orders.model.OrderPage
import com.chengxu.autoservice.core.orders.model.OrderScope

data class OrderPageQuery(
    val scope: OrderScope,
    val cursor: String? = null,
    val updatedAfter: String? = null,
    val limit: Int = 50,
) {
    init {
        require(limit in 1..100)
        require(cursor == null || updatedAfter == null)
    }
}

sealed interface OrderReadFailure {
    data object Unauthorized : OrderReadFailure
    data object Forbidden : OrderReadFailure
    data object NotFound : OrderReadFailure
    data object NetworkUnavailable : OrderReadFailure
    data object ServerError : OrderReadFailure
    data object MalformedResponse : OrderReadFailure
}

sealed interface OrderReadResult<out T> {
    data class Success<T>(val value: T) : OrderReadResult<T>
    data class Failure(val reason: OrderReadFailure) : OrderReadResult<Nothing>
}

interface OrderReadApi {
    suspend fun fetchPage(token: String, query: OrderPageQuery): OrderReadResult<OrderPage>
    suspend fun fetchDetail(token: String, orderId: String): OrderReadResult<OrderDetail>
}
