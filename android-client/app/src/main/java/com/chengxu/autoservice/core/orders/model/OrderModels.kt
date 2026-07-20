package com.chengxu.autoservice.core.orders.model

enum class OrderStatus(val wireValue: String) {
    IN_REPAIR("在修中"),
    COMPLETED("已完工"),
    PENDING_SETTLEMENT("待结算"),
    SETTLED("已结算"),
    ;

    companion object {
        fun fromWire(value: String): OrderStatus? =
            entries.firstOrNull { status -> status.wireValue == value.trim() }
    }
}

enum class OrderScope {
    CURRENT,
    HISTORY,
}

data class ReceiptMetadata(
    val name: String = "",
    val contentType: String = "",
    val sizeBytes: Long = 0,
    val uploadedAt: String = "",
)

data class OrderSummary(
    val id: String,
    val companyId: String,
    val version: Long,
    val date: String,
    val dateSortKey: String,
    val time: String,
    val plate: String,
    val customer: String,
    val car: String,
    val type: String,
    val status: String,
    val amountCents: Long,
    val record: String,
    val insuranceExpiry: String,
    val delivery: String,
    val updatedAt: String,
)

data class OrderDetail(
    val summary: OrderSummary,
    val phone: String,
    val insurer: String,
    val staff: String,
    val vin: String,
    val claimNo: String,
    val accidentType: String,
    val paymentMethod: String,
    val remark: String,
    val laborCents: Long,
    val materialCents: Long,
    val settlementDate: String,
    val settlementTime: String,
    val settlementRemark: String,
    val receipt: ReceiptMetadata?,
    val voided: Boolean,
    val voidedAt: String,
    val voidReason: String,
)

data class OrderDraft(
    val localId: String,
    val companyId: String,
    val baseOrderId: String?,
    val expectedVersion: Long?,
    val payloadJson: String,
    val updatedAtMillis: Long,
)

data class SettlementDraft(
    val orderId: String,
    val expectedVersion: Long,
    val date: String,
    val time: String,
    val remark: String,
)

enum class BusinessCapability {
    VIEW_ORDERS,
    CREATE_ORDER,
    EDIT_ORDER,
    ADVANCE_ORDER_STATUS,
    VIEW_RECORDS,
    MANAGE_RECORDS,
    SETTLE_ORDER,
    REVERSE_SETTLEMENT,
    VOID_ORDER,
    MAINTAIN_RECEIPT,
    EXPORT_DATA,
}

data class OrderPage(
    val orders: List<OrderSummary>,
    val nextCursor: String?,
    val removedOrderIds: List<String>,
    val serverTime: String,
    val capabilities: Set<BusinessCapability>,
)
