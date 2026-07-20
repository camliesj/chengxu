package com.chengxu.autoservice.core.orders.cache

import androidx.room.Entity
import androidx.room.Index

@Entity(
    tableName = "order_summaries",
    primaryKeys = ["companyId", "orderId"],
    indices = [Index(value = ["companyId", "scope", "dateSortKey", "time"])],
)
data class OrderSummaryEntity(
    val companyId: String,
    val orderId: String,
    val scope: String,
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
