package com.chengxu.autoservice.core.orders.model

data class SettlementCommand(
    val operationId: String,
    val expectedVersion: Long,
    val paymentMethod: String,
    val settlementDate: String,
    val settlementTime: String,
    val settlementRemark: String,
    val receipt: ReceiptReference,
)
