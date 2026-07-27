package com.chengxu.autoservice.core.orders

import kotlinx.serialization.Serializable

@Serializable
data class CustomerVehicleRecord(
    val id: String,
    val companyId: String,
    val customer: String,
    val phone: String,
    val plate: String,
    val car: String,
    val vin: String,
    val insurer: String,
    val vehicleType: String,
    val source: String,
    val remark: String,
)

interface CustomerVehiclesApi {
    suspend fun fetch(token: String): CustomerVehiclesResult
}

sealed interface CustomerVehiclesResult {
    data class Success(val records: List<CustomerVehicleRecord>) : CustomerVehiclesResult
    data class Failure(val reason: OrdersFailure) : CustomerVehiclesResult
}
