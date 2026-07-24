package com.chengxu.autoservice.core.orders

import com.chengxu.autoservice.core.orders.model.OrderCommandResult
import com.chengxu.autoservice.core.orders.model.OrderDetail
import com.chengxu.autoservice.core.orders.model.OrderEditCommand

interface OrderEditApi {
    suspend fun edit(token: String, orderId: String, command: OrderEditCommand): OrderCommandResult<OrderDetail>
    suspend fun queryOperation(token: String, operationId: String): OrderCommandResult<OrderDetail>
}
