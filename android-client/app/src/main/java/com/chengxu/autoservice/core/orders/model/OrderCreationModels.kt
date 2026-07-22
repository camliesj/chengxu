package com.chengxu.autoservice.core.orders.model

import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import java.math.BigInteger

data class OrderCreationStaff(
    val id: String = "",
    val name: String,
    val title: String = "",
)

data class OrderCreationDefaults(
    val insurer: String = "",
    val staff: String = "",
    val type: String = "",
    val accidentType: String = "",
    val delivery: String = "",
    val laborCents: Long = 0,
    val materialCents: Long = 0,
    val remark: String = "",
)

data class OrderCreationOptions(
    val insurers: List<String> = emptyList(),
    val staff: List<OrderCreationStaff> = emptyList(),
    val vehicleTypes: List<String> = emptyList(),
    val accidentTypes: List<String> = emptyList(),
    val deliverySuggestions: List<String> = emptyList(),
)

data class OrderCreationMetadata(
    val contractVersion: Int,
    val requiredFields: Set<String>,
    val defaults: OrderCreationDefaults,
    val options: OrderCreationOptions,
    val maxLengths: Map<String, Int>,
)

data class OrderCreationMetadataEnvelope(
    val metadata: OrderCreationMetadata,
    val capabilities: Set<BusinessCapability>,
    val canCreate: Boolean,
    val serverTime: String,
)

enum class OrderCreationOperationState {
    PENDING,
    COMPLETED,
}

data class OrderCreationOperation(
    val operationId: String,
    val state: OrderCreationOperationState,
    val order: OrderDetail? = null,
)

data class OrderCreationForm(
    val customer: String = "",
    val phone: String = "",
    val plate: String = "",
    val car: String = "",
    val vin: String = "",
    val staff: String = "",
    val insuranceExpiry: String = "",
    val insurer: String = "",
    val type: String = "",
    val accidentType: String = "",
    val claimNo: String = "",
    val record: String = "",
    val labor: String = "0",
    val material: String = "0",
    val delivery: String = "",
    val remark: String = "",
)

data class OrderCreateInput(
    val customer: String,
    val phone: String,
    val plate: String,
    val car: String,
    val vin: String,
    val staff: String,
    val insuranceExpiry: String,
    val insurer: String,
    val type: String,
    val accidentType: String,
    val claimNo: String,
    val record: String,
    val laborCents: Long,
    val materialCents: Long,
    val delivery: String,
    val remark: String,
)

data class OrderCreateCommand(
    val operationId: String,
    val order: OrderCreateInput,
) {
    fun toJsonObject(): JsonObject = buildJsonObject {
        put("operationId", operationId)
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

    companion object {
        val CLIENT_FIELDS: Set<String> = linkedSetOf(
            "customer", "phone", "plate", "car", "vin", "staff", "insuranceExpiry",
            "insurer", "type", "accidentType", "claimNo", "record", "laborCents",
            "materialCents", "delivery", "remark",
        )
    }
}

fun OrderCreationForm.toCreateCommand(operationId: String): OrderCommandResult<OrderCreateCommand> {
    val laborResult = moneyTextToCents(labor, "laborCents")
    val materialResult = moneyTextToCents(material, "materialCents")
    val errors = buildMap {
        laborResult.error?.let { put("labor", it) }
        materialResult.error?.let { put("material", it) }
    }
    if (errors.isNotEmpty()) return OrderCommandResult.ValidationFailure(errors)

    fun String.cleaned(): String = trim()
    return OrderCommandResult.Success(
        OrderCreateCommand(
            operationId = operationId.cleaned(),
            order = OrderCreateInput(
                customer = customer.cleaned(),
                phone = phone.cleaned(),
                plate = plate.cleaned(),
                car = car.cleaned(),
                vin = vin.cleaned(),
                staff = staff.cleaned(),
                insuranceExpiry = insuranceExpiry.cleaned(),
                insurer = insurer.cleaned(),
                type = type.cleaned(),
                accidentType = accidentType.cleaned(),
                claimNo = claimNo.cleaned(),
                record = record.cleaned(),
                laborCents = checkNotNull(laborResult.value),
                materialCents = checkNotNull(materialResult.value),
                delivery = delivery.cleaned(),
                remark = remark.cleaned(),
            ),
        ),
    )
}

private data class MoneyResult(val value: Long? = null, val error: String? = null)

private fun moneyTextToCents(raw: String, wireField: String): MoneyResult {
    val text = raw.trim().ifEmpty { "0" }
    if (text.startsWith('-')) return MoneyResult(error = "order.$wireField.non_negative")
    if (!MONEY_PATTERN.matches(text)) {
        val error = if (THREE_DECIMAL_PATTERN.matches(text)) "max_two_decimals" else "invalid"
        return MoneyResult(error = "order.$wireField.$error")
    }
    val pieces = text.split('.', limit = 2)
    val whole = pieces[0].toBigIntegerOrNull() ?: return MoneyResult(error = "order.$wireField.invalid")
    val fraction = pieces.getOrElse(1) { "" }.padEnd(2, '0')
    val cents = whole * HUNDRED + (fraction.toBigIntegerOrNull() ?: BigInteger.ZERO)
    return if (cents > MAX_SAFE_INTEGER) MoneyResult(error = "order.$wireField.out_of_range")
    else MoneyResult(value = cents.toLong())
}

private val MONEY_PATTERN = Regex("^\\d+(?:\\.\\d{0,2})?$")
private val THREE_DECIMAL_PATTERN = Regex("^\\d+\\.\\d{3,}$")
private val HUNDRED = BigInteger.valueOf(100)
// Keep Android aligned with the shared JSON/JavaScript safe-integer boundary.
private val MAX_SAFE_INTEGER = BigInteger("9007199254740991")
