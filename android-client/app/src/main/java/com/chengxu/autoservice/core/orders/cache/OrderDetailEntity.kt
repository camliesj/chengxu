package com.chengxu.autoservice.core.orders.cache

import androidx.room.Entity

@Entity(tableName = "order_details", primaryKeys = ["companyId", "orderId"])
data class OrderDetailEntity(
    val companyId: String, val orderId: String, val version: Long,
    val date: String, val dateSortKey: String, val time: String,
    val plate: String, val customer: String, val car: String, val type: String,
    val status: String, val amountCents: Long, val record: String,
    val insuranceExpiry: String, val delivery: String, val updatedAt: String,
    val encryptedPhone: String, val insurer: String, val staff: String,
    val encryptedVin: String, val claimNo: String, val accidentType: String,
    val paymentMethod: String, val remark: String,
    val laborCents: Long, val materialCents: Long,
    val settlementDate: String, val settlementTime: String,
    val settlementRemark: String, val receiptName: String,
    val receiptContentType: String, val receiptSizeBytes: Long,
    val receiptUploadedAt: String, val voided: Boolean,
    val voidedAt: String, val voidReason: String,
)
