package com.chengxu.autoservice.ui.status

import com.chengxu.autoservice.core.network.ConnectionState
import com.chengxu.autoservice.core.orders.model.OrderDetail
import com.chengxu.autoservice.core.orders.model.OrderStatus

enum class StatusSubmitState { IDLE, SUBMITTING, CONFIRMING }

data class OrderStatusUiState(
    val loading: Boolean = false,
    val orderId: String = "",
    val targetStatus: OrderStatus? = null,
    val detail: OrderDetail? = null,
    val connection: ConnectionState = ConnectionState.Offline,
    val canSubmit: Boolean = false,
    val submitState: StatusSubmitState = StatusSubmitState.IDLE,
    val operationId: String? = null,
    val completedOrderId: String? = null,
    val message: String? = null,
)
