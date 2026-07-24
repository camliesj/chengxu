package com.chengxu.autoservice.core.orders.model

import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

data class OrderDetailEnvelope(
    val order: OrderDetail,
    val capabilities: Set<BusinessCapability>,
    val serverTime: String,
)

data class OrderEditCommand(
    val operationId: String,
    val expectedVersion: Long,
    val order: OrderCreateInput,
) {
    fun toJsonObject(): JsonObject = buildJsonObject {
        put("operationId", operationId)
        put("expectedVersion", expectedVersion)
        put("order", buildJsonObject {
            put("customer", order.customer)
            put("phone", order.phone)
            put("plate", order.plate)
            put("car", order.car)
            put("vin", order.vin)
            put("staff", order.staff)
            put("insuranceExpiry", order.insuranceExpiry)
            put("insurer", order.insurer)
            put("type", order.type)
            put("accidentType", order.accidentType)
            put("claimNo", order.claimNo)
            put("record", order.record)
            put("laborCents", order.laborCents)
            put("materialCents", order.materialCents)
            put("delivery", order.delivery)
            put("remark", order.remark)
        })
    }
}

data class ConflictFields(val names: Set<String> = emptySet())

fun OrderCreationForm.toEditCommand(
    operationId: String,
    expectedVersion: Long,
): OrderCommandResult<OrderEditCommand> = when (val create = toCreateCommand(operationId)) {
    is OrderCommandResult.Success -> OrderCommandResult.Success(
        OrderEditCommand(
            operationId = create.value.operationId,
            expectedVersion = expectedVersion,
            order = create.value.order,
        ),
    )
    is OrderCommandResult.ValidationFailure -> create
    else -> error("Unexpected local edit command result")
}
