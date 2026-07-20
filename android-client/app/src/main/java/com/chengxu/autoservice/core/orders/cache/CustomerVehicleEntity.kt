package com.chengxu.autoservice.core.orders.cache

import androidx.room.Entity

@Entity(tableName = "customer_vehicles", primaryKeys = ["companyId", "recordId"])
data class CustomerVehicleEntity(
    val companyId: String,
    val recordId: String,
    val encryptedPayload: String,
    val updatedAt: String,
)
