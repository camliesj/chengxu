package com.chengxu.autoservice.core.orders

import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.put
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL

interface CustomerVehiclesHttpTransport {
    suspend fun get(url: String, authorization: String): OrdersHttpResponse
    suspend fun post(url: String, authorization: String, body: String): OrdersHttpResponse
}

class UrlConnectionCustomerVehiclesHttpTransport : CustomerVehiclesHttpTransport {
    override suspend fun get(url: String, authorization: String) = request(url, authorization, "GET", null)
    override suspend fun post(url: String, authorization: String, body: String) = request(url, authorization, "POST", body)

    private suspend fun request(url: String, authorization: String, method: String, body: String?): OrdersHttpResponse = kotlinx.coroutines.withContext(Dispatchers.IO) {
        val connection = (URL(url).openConnection() as HttpURLConnection).apply {
            requestMethod = method; connectTimeout = 10_000; readTimeout = 10_000
            setRequestProperty("Accept", "application/json"); setRequestProperty("Authorization", authorization)
            if (body != null) { doOutput = true; setRequestProperty("Content-Type", "application/json; charset=utf-8") }
        }
        try {
            body?.let { connection.outputStream.use { output -> output.write(it.toByteArray(Charsets.UTF_8)) } }
            val status = connection.responseCode
            val stream = if (status in 200..299) connection.inputStream else connection.errorStream
            OrdersHttpResponse(status, stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty())
        } finally { connection.disconnect() }
    }
}

class HttpUrlConnectionCustomerVehiclesApi(
    apiOrigin: String,
    private val transport: CustomerVehiclesHttpTransport = UrlConnectionCustomerVehiclesHttpTransport(),
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

    override suspend fun save(token: String, record: CustomerVehicleRecord): CustomerVehicleWriteResult = try {
        val response = transport.post(url, "Bearer $token", buildJsonObject {
            put("vehicle", buildJsonObject {
                put("id", record.id); put("companyId", record.companyId); put("customer", record.customer)
                put("phone", record.phone); put("plate", record.plate); put("car", record.car); put("vin", record.vin)
                put("insurer", record.insurer); put("vehicleType", record.vehicleType); put("source", record.source); put("remark", record.remark)
            })
        }.toString())
        when (response.status) {
            200, 201 -> {
                val saved = json.parseToJsonElement(response.body).jsonObject["vehicle"]?.jsonObject?.toCustomerVehicleOrNull()
                if (saved == null) CustomerVehicleWriteResult.Failure(OrdersFailure.MalformedResponse) else CustomerVehicleWriteResult.Success(saved)
            }
            401 -> CustomerVehicleWriteResult.Failure(OrdersFailure.Unauthorized)
            else -> CustomerVehicleWriteResult.Failure(OrdersFailure.ServerError)
        }
    } catch (cancellation: CancellationException) {
        throw cancellation
    } catch (_: IOException) {
        CustomerVehicleWriteResult.Failure(OrdersFailure.NetworkUnavailable)
    } catch (_: Exception) {
        CustomerVehicleWriteResult.Failure(OrdersFailure.MalformedResponse)
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
