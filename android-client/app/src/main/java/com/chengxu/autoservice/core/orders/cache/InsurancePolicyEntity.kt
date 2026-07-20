package com.chengxu.autoservice.core.orders.cache

import androidx.room.Entity

@Entity(tableName = "insurance_policies", primaryKeys = ["companyId", "recordId"])
data class InsurancePolicyEntity(
    val companyId: String,
    val recordId: String,
    val encryptedPayload: String,
    val updatedAt: String,
)
