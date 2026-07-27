package com.chengxu.autoservice.core.orders.model

import kotlinx.serialization.Serializable

data class OrderStatusCommand(
    val operationId: String,
    val expectedVersion: Long,
    val targetStatus: OrderStatus,
)

@Serializable
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
