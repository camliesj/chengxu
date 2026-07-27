package com.chengxu.autoservice.core.orders

import kotlinx.serialization.Serializable

@Serializable
data class InsurancePolicyRecord(
    val id: String, val companyId: String, val version: Int,
    val plate: String, val customer: String, val phone: String, val car: String,
    val vin: String, val expiry: String, val amount: Long, val type: String,
    val insurer: String, val updatedAt: String,
)

interface InsurancePoliciesApi {
    suspend fun fetch(token: String): InsurancePoliciesResult
    suspend fun save(
        token: String,
        operationId: String,
        expectedVersion: Int?,
        policy: InsurancePolicyRecord,
    ): InsurancePolicyWriteResult
    suspend fun delete(
        token: String,
        operationId: String,
        id: String,
        expectedVersion: Int,
    ): InsurancePolicyWriteResult
}

sealed interface InsurancePoliciesResult {
    data class Success(val records: List<InsurancePolicyRecord>) : InsurancePoliciesResult
    data class Failure(val reason: OrdersFailure) : InsurancePoliciesResult
}

sealed interface InsurancePolicyWriteResult {
    data class Success(val policy: InsurancePolicyRecord) : InsurancePolicyWriteResult
    data class Deleted(val id: String) : InsurancePolicyWriteResult
    data class Conflict(val latest: InsurancePolicyRecord?) : InsurancePolicyWriteResult
    data class Failure(val reason: OrdersFailure) : InsurancePolicyWriteResult
}
