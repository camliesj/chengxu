package com.chengxu.autoservice.core.orders

import com.chengxu.autoservice.core.orders.model.OrderCommandResult
import com.chengxu.autoservice.core.orders.model.OrderCreateCommand
import com.chengxu.autoservice.core.orders.model.OrderCreationMetadataEnvelope
import com.chengxu.autoservice.core.orders.model.OrderDetail

interface OrderCreateApi {
    suspend fun fetchMetadata(token: String): OrderCommandResult<OrderCreationMetadataEnvelope>

    suspend fun create(
        token: String,
        command: OrderCreateCommand,
    ): OrderCommandResult<OrderDetail>

    suspend fun queryOperation(
        token: String,
        operationId: String,
    ): OrderCommandResult<OrderDetail>
}
