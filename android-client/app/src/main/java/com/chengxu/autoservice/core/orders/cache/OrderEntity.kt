package com.chengxu.autoservice.core.orders.cache

import androidx.room.Entity
import androidx.room.Index

@Entity(
    tableName = "orders",
    primaryKeys = ["companyId", "orderId"],
    indices = [Index(value = ["companyId", "dateSortKey", "time"])],
)
data class OrderEntity(
    val companyId: String,
    val orderId: String,
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
)
