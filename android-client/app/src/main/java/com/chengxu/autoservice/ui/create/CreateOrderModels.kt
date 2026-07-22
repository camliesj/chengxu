package com.chengxu.autoservice.ui.create

import com.chengxu.autoservice.core.network.ConnectionState
import com.chengxu.autoservice.core.orders.model.OrderCreationMetadata

enum class CreateOrderStep(val title: String) {
    CUSTOMER("客户与车辆"),
    INSURANCE("保险与事故"),
    REPAIR("维修与费用"),
    CONFIRM("确认提交"),
}

enum class CreateOrderField(val wireName: String) {
    CUSTOMER("customer"),
    PHONE("phone"),
    PLATE("plate"),
    CAR("car"),
    VIN("vin"),
    STAFF("staff"),
    INSURANCE_EXPIRY("insuranceExpiry"),
    INSURER("insurer"),
    TYPE("type"),
    ACCIDENT_TYPE("accidentType"),
    CLAIM_NO("claimNo"),
    RECORD("record"),
    LABOR("labor"),
    MATERIAL("material"),
    DELIVERY("delivery"),
    REMARK("remark"),
    ;

    companion object {
        fun fromWire(value: String): CreateOrderField? = entries.firstOrNull {
            it.wireName == value || (value == "laborCents" && it == LABOR) ||
                (value == "materialCents" && it == MATERIAL)
        }
    }
}

data class CreateOrderFields(
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
) {
    fun value(field: CreateOrderField): String = when (field) {
        CreateOrderField.CUSTOMER -> customer
        CreateOrderField.PHONE -> phone
        CreateOrderField.PLATE -> plate
        CreateOrderField.CAR -> car
        CreateOrderField.VIN -> vin
        CreateOrderField.STAFF -> staff
        CreateOrderField.INSURANCE_EXPIRY -> insuranceExpiry
        CreateOrderField.INSURER -> insurer
        CreateOrderField.TYPE -> type
        CreateOrderField.ACCIDENT_TYPE -> accidentType
        CreateOrderField.CLAIM_NO -> claimNo
        CreateOrderField.RECORD -> record
        CreateOrderField.LABOR -> labor
        CreateOrderField.MATERIAL -> material
        CreateOrderField.DELIVERY -> delivery
        CreateOrderField.REMARK -> remark
    }

    fun with(field: CreateOrderField, value: String): CreateOrderFields = when (field) {
        CreateOrderField.CUSTOMER -> copy(customer = value)
        CreateOrderField.PHONE -> copy(phone = value)
        CreateOrderField.PLATE -> copy(plate = value)
        CreateOrderField.CAR -> copy(car = value)
        CreateOrderField.VIN -> copy(vin = value)
        CreateOrderField.STAFF -> copy(staff = value)
        CreateOrderField.INSURANCE_EXPIRY -> copy(insuranceExpiry = value)
        CreateOrderField.INSURER -> copy(insurer = value)
        CreateOrderField.TYPE -> copy(type = value)
        CreateOrderField.ACCIDENT_TYPE -> copy(accidentType = value)
        CreateOrderField.CLAIM_NO -> copy(claimNo = value)
        CreateOrderField.RECORD -> copy(record = value)
        CreateOrderField.LABOR -> copy(labor = value)
        CreateOrderField.MATERIAL -> copy(material = value)
        CreateOrderField.DELIVERY -> copy(delivery = value)
        CreateOrderField.REMARK -> copy(remark = value)
    }
}

data class CreateOrderUiState(
    val loading: Boolean = true,
    val step: CreateOrderStep = CreateOrderStep.CUSTOMER,
    val fields: CreateOrderFields = CreateOrderFields(),
    val metadata: OrderCreationMetadata? = null,
    val canCreate: Boolean = false,
    val connection: ConnectionState = ConnectionState.Offline,
    val fieldErrors: Map<CreateOrderField, String> = emptyMap(),
    val dirty: Boolean = false,
    val submitting: Boolean = false,
    val unknownOperationId: String? = null,
    val message: String? = null,
    val showLeaveConfirmation: Boolean = false,
)

sealed interface CreateOrderEvent {
    data class Created(val orderId: String) : CreateOrderEvent
    data object Exit : CreateOrderEvent
}

internal val stepFields = mapOf(
    CreateOrderStep.CUSTOMER to setOf(
        CreateOrderField.CUSTOMER, CreateOrderField.PHONE, CreateOrderField.PLATE,
        CreateOrderField.CAR, CreateOrderField.VIN, CreateOrderField.STAFF,
    ),
    CreateOrderStep.INSURANCE to setOf(
        CreateOrderField.INSURANCE_EXPIRY, CreateOrderField.INSURER, CreateOrderField.TYPE,
        CreateOrderField.ACCIDENT_TYPE, CreateOrderField.CLAIM_NO,
    ),
    CreateOrderStep.REPAIR to setOf(
        CreateOrderField.RECORD, CreateOrderField.LABOR, CreateOrderField.MATERIAL,
        CreateOrderField.DELIVERY, CreateOrderField.REMARK,
    ),
    CreateOrderStep.CONFIRM to emptySet(),
)
