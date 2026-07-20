package com.chengxu.autoservice.core.orders.cache

import androidx.room.Entity

@Entity(tableName = "sync_cursors", primaryKeys = ["companyId", "resource"])
data class SyncCursorEntity(
    val companyId: String,
    val resource: String,
    val cursor: String,
    val serverTime: String,
    val updatedAtMillis: Long,
)
