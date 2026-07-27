package com.chengxu.autoservice.core.orders

import com.chengxu.autoservice.core.orders.model.OrderCommandResult
import com.chengxu.autoservice.core.orders.model.OrderDetail
import com.chengxu.autoservice.core.orders.model.OrderStatusCommand

interface OrderStatusApi {
    suspend fun change(token: String, orderId: String, command: OrderStatusCommand): OrderCommandResult<OrderDetail>
    suspend fun queryOperation(token: String, operationId: String): OrderCommandResult<OrderDetail>
}
