package com.chengxu.autoservice.core.orders.model

data class OrderStatusCommand(
    val operationId: String,
    val expectedVersion: Long,
    val targetStatus: OrderStatus,
)

data class PendingStatusEnvelope(
    val orderId: String,
    val operationId: String,
    val expectedVersion: Long,
    val targetStatus: String,
    val createdAtMillis: Long,
)

data class PendingStatusRecovery(
    val envelope: PendingStatusEnvelope,
    val result: OrderCommandResult<OrderDetail>,
)
