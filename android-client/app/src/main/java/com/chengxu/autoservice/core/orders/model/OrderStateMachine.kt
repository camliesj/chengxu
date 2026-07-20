package com.chengxu.autoservice.core.orders.model

import com.chengxu.autoservice.core.model.UserRole

data class OrderStatusTransition(
    val from: OrderStatus,
    val to: OrderStatus,
)

private val forwardTransitions = setOf(
    OrderStatusTransition(OrderStatus.IN_REPAIR, OrderStatus.COMPLETED),
    OrderStatusTransition(OrderStatus.COMPLETED, OrderStatus.PENDING_SETTLEMENT),
)

private val administratorBackwardTransitions = setOf(
    OrderStatusTransition(OrderStatus.COMPLETED, OrderStatus.IN_REPAIR),
    OrderStatusTransition(OrderStatus.PENDING_SETTLEMENT, OrderStatus.COMPLETED),
)

fun allowedOrderTransition(
    role: UserRole,
    from: OrderStatus,
    to: OrderStatus,
): Boolean {
    val transition = OrderStatusTransition(from = from, to = to)
    return transition in forwardTransitions ||
        (role == UserRole.ADMINISTRATOR && transition in administratorBackwardTransitions)
}
