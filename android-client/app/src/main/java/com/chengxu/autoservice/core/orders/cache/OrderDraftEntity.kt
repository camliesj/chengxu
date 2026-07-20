package com.chengxu.autoservice.core.orders.cache

import androidx.room.Entity

@Entity(tableName = "order_drafts", primaryKeys = ["companyId", "localId"])
data class OrderDraftEntity(
    val companyId: String,
    val localId: String,
    val baseOrderId: String?,
    val expectedVersion: Long?,
    val encryptedPayload: String,
    val updatedAtMillis: Long,
)
