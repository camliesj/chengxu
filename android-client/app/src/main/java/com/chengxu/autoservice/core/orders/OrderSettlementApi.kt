package com.chengxu.autoservice.core.orders

import com.chengxu.autoservice.core.orders.model.OrderCommandResult
import com.chengxu.autoservice.core.orders.model.OrderDetail
import com.chengxu.autoservice.core.orders.model.ReceiptMetadata
import com.chengxu.autoservice.core.orders.model.SettlementCommand

interface OrderSettlementApi {
    suspend fun settle(token: String, orderId: String, command: SettlementCommand): OrderCommandResult<OrderDetail>
    suspend fun reverse(token: String, orderId: String, operationId: String, expectedVersion: Long): OrderCommandResult<OrderDetail>
    suspend fun updateReceipt(token: String, orderId: String, operationId: String, expectedVersion: Long, receipt: ReceiptMetadata?): OrderCommandResult<OrderDetail>
}
