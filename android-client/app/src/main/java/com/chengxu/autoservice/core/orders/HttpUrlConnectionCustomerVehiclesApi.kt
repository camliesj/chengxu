package com.chengxu.autoservice.core.orders

import kotlinx.coroutines.CancellationException
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonObject
import java.io.IOException

class HttpUrlConnectionCustomerVehiclesApi(
    apiOrigin: String,
    private val transport: OrdersHttpTransport = UrlConnectionOrdersHttpTransport(),
    private val json: Json = Json { ignoreUnknownKeys = true },
) : CustomerVehiclesApi {
    private val url = "${apiOrigin.trimEnd('/')}/api/customer-vehicles"

    override suspend fun fetch(token: String): CustomerVehiclesResult = try {
        val response = transport.get(url, "Bearer $token")
        when (response.status) {
            200 -> mapSuccess(response.body)
            401 -> CustomerVehiclesResult.Failure(OrdersFailure.Unauthorized)
            403, 404 -> CustomerVehiclesResult.Failure(OrdersFailure.ServerError)
            else -> CustomerVehiclesResult.Failure(OrdersFailure.ServerError)
        }
    } catch (cancellation: CancellationException) {
        throw cancellation
    } catch (_: IOException) {
        CustomerVehiclesResult.Failure(OrdersFailure.NetworkUnavailable)
    } catch (_: Exception) {
        CustomerVehiclesResult.Failure(OrdersFailure.MalformedResponse)
    }

    private fun mapSuccess(body: String): CustomerVehiclesResult = try {
        val vehicles = json.parseToJsonElement(body).jsonObject["vehicles"] as? JsonArray
            ?: return CustomerVehiclesResult.Failure(OrdersFailure.MalformedResponse)
        val records = vehicles.map { element -> element.jsonObject.toCustomerVehicleOrNull() }
        if (records.any { it == null }) CustomerVehiclesResult.Failure(OrdersFailure.MalformedResponse)
        else CustomerVehiclesResult.Success(records.filterNotNull())
    } catch (_: Exception) {
        CustomerVehiclesResult.Failure(OrdersFailure.MalformedResponse)
    }
}

private fun JsonObject.toCustomerVehicleOrNull(): CustomerVehicleRecord? {
    val id = requiredVehicleString("id") ?: return null
    val companyId = requiredVehicleString("companyId") ?: return null
    return CustomerVehicleRecord(
        id = id, companyId = companyId,
        customer = stringOrEmpty("customer"), phone = stringOrEmpty("phone"),
        plate = stringOrEmpty("plate"), car = stringOrEmpty("car"),
        vin = stringOrEmpty("vin"), insurer = stringOrEmpty("insurer"),
        vehicleType = stringOrEmpty("vehicleType"), source = stringOrEmpty("source"),
        remark = stringOrEmpty("remark"),
    )
}

private fun JsonObject.requiredVehicleString(key: String): String? = stringOrEmpty(key).takeIf(String::isNotBlank)
private fun JsonObject.stringOrEmpty(key: String): String = (this[key] as? JsonPrimitive)
    ?.takeIf { it.isString }?.content?.trim().orEmpty()
