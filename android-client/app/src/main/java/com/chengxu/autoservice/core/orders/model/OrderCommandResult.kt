package com.chengxu.autoservice.core.orders.model

sealed interface OrderCommandResult<out T> {
    data class Success<T>(val value: T) : OrderCommandResult<T>
    data class ValidationFailure(val fieldErrors: Map<String, String>) : OrderCommandResult<Nothing>
    data object Unauthorized : OrderCommandResult<Nothing>
    data object Forbidden : OrderCommandResult<Nothing>
    data class Conflict(val latest: OrderDetail?) : OrderCommandResult<Nothing>
    data class UnknownResult(val operationId: String) : OrderCommandResult<Nothing>
    data object NetworkUnavailable : OrderCommandResult<Nothing>
    data object ServerFailure : OrderCommandResult<Nothing>
    data object MalformedResponse : OrderCommandResult<Nothing>
}
