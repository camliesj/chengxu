package com.chengxu.autoservice.core.orders

import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.put
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URLEncoder
import java.net.URL
import java.nio.charset.StandardCharsets

interface InsurancePoliciesHttpTransport {
    suspend fun get(url: String, authorization: String): OrdersHttpResponse
    suspend fun post(url: String, authorization: String, body: String): OrdersHttpResponse
    suspend fun delete(url: String, authorization: String, body: String): OrdersHttpResponse
}

class UrlConnectionInsurancePoliciesHttpTransport : InsurancePoliciesHttpTransport {
    override suspend fun get(url: String, authorization: String) = request(url, authorization, "GET", null)
    override suspend fun post(url: String, authorization: String, body: String) = request(url, authorization, "POST", body)
    override suspend fun delete(url: String, authorization: String, body: String) = request(url, authorization, "DELETE", body)

    private suspend fun request(url: String, authorization: String, method: String, body: String?): OrdersHttpResponse = withContext(Dispatchers.IO) {
        val connection = (URL(url).openConnection() as HttpURLConnection).apply {
            requestMethod = method; connectTimeout = 10_000; readTimeout = 10_000
            setRequestProperty("Accept", "application/json"); setRequestProperty("Authorization", authorization)
            if (body != null) { doOutput = true; setRequestProperty("Content-Type", "application/json; charset=utf-8") }
        }
        try {
            body?.let { connection.outputStream.use { stream -> stream.write(it.toByteArray(Charsets.UTF_8)) } }
            val status = connection.responseCode
            val stream = if (status in 200..299) connection.inputStream else connection.errorStream
            OrdersHttpResponse(status, stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty())
        } finally { connection.disconnect() }
    }
}

class HttpUrlConnectionInsurancePoliciesApi(
    apiOrigin: String,
    private val transport: InsurancePoliciesHttpTransport = UrlConnectionInsurancePoliciesHttpTransport(),
) : InsurancePoliciesApi {
    private val url = "${apiOrigin.trimEnd('/')}/api/insurance-policies"

    override suspend fun fetch(token: String): InsurancePoliciesResult = try {
        val response = transport.get(url, "Bearer $token")
        when (response.status) {
            200 -> map(response.body)
            401 -> InsurancePoliciesResult.Failure(OrdersFailure.Unauthorized)
            else -> InsurancePoliciesResult.Failure(OrdersFailure.ServerError)
        }
    } catch (cancelled: CancellationException) { throw cancelled
    } catch (_: IOException) { InsurancePoliciesResult.Failure(OrdersFailure.NetworkUnavailable)
    } catch (_: Exception) { InsurancePoliciesResult.Failure(OrdersFailure.MalformedResponse) }

    override suspend fun save(token: String, operationId: String, expectedVersion: Int?, policy: InsurancePolicyRecord): InsurancePolicyWriteResult = write {
        val response = transport.post(url, "Bearer $token", buildJsonObject {
            put("operationId", operationId)
            expectedVersion?.let { put("expectedVersion", it) } ?: put("expectedVersion", JsonNull)
            put("policy", policy.toJson())
        }.toString())
        mapWrite(response, operationId)
    }

    override suspend fun delete(token: String, operationId: String, id: String, expectedVersion: Int): InsurancePolicyWriteResult = write {
        val response = transport.delete(
            "$url/${encodePathSegment(id)}", "Bearer $token", buildJsonObject {
                put("operationId", operationId); put("expectedVersion", expectedVersion)
            }.toString(),
        )
        mapWrite(response, operationId)
    }

    private fun map(body: String): InsurancePoliciesResult = try {
        val rows = Json.parseToJsonElement(body).jsonObject["policies"]?.jsonArray
            ?: return InsurancePoliciesResult.Failure(OrdersFailure.MalformedResponse)
        val records = rows.map { element -> element.jsonObject.toRecord() }
        if (records.any { it == null }) InsurancePoliciesResult.Failure(OrdersFailure.MalformedResponse)
        else InsurancePoliciesResult.Success(records.filterNotNull())
    } catch (_: Exception) { InsurancePoliciesResult.Failure(OrdersFailure.MalformedResponse) }

    private fun JsonObject.toRecord(): InsurancePolicyRecord? {
        fun text(key: String) = (this[key] as? JsonPrimitive)?.content?.trim().orEmpty()
        val version = text("version").toIntOrNull() ?: return null
        val amount = text("amount").toLongOrNull() ?: 0L
        val id = text("id"); val companyId = text("companyId")
        if (id.isBlank() || companyId.isBlank() || version < 1) return null
        return InsurancePolicyRecord(id, companyId, version, text("plate"), text("customer"), text("phone"), text("car"), text("vin"), text("expiry"), amount, text("type"), text("insurer"), text("updatedAt"))
    }

    private suspend fun write(block: suspend () -> InsurancePolicyWriteResult): InsurancePolicyWriteResult = try {
        block()
    } catch (cancelled: CancellationException) { throw cancelled
    } catch (_: IOException) { InsurancePolicyWriteResult.Failure(OrdersFailure.NetworkUnavailable)
    } catch (_: Exception) { InsurancePolicyWriteResult.Failure(OrdersFailure.MalformedResponse) }

    private fun mapWrite(response: OrdersHttpResponse, operationId: String): InsurancePolicyWriteResult = when (response.status) {
        200, 201 -> {
            val envelope = parseObject(response.body) ?: return InsurancePolicyWriteResult.Failure(OrdersFailure.MalformedResponse)
            val policy = (envelope["policy"] as? JsonObject)?.toRecord()
            when {
                policy != null -> InsurancePolicyWriteResult.Success(policy)
                envelope.text("id").isNotBlank() -> InsurancePolicyWriteResult.Deleted(envelope.text("id"))
                else -> InsurancePolicyWriteResult.Failure(OrdersFailure.MalformedResponse)
            }
        }
        401 -> InsurancePolicyWriteResult.Failure(OrdersFailure.Unauthorized)
        409 -> {
            val envelope = parseObject(response.body) ?: return InsurancePolicyWriteResult.Failure(OrdersFailure.MalformedResponse)
            when (envelope.text("error")) {
                "VERSION_CONFLICT" -> InsurancePolicyWriteResult.Conflict((envelope["policy"] as? JsonObject)?.toRecord())
                else -> InsurancePolicyWriteResult.Failure(OrdersFailure.ServerError)
            }
        }
        else -> InsurancePolicyWriteResult.Failure(OrdersFailure.ServerError)
    }

    private fun parseObject(body: String) = runCatching { Json.parseToJsonElement(body).jsonObject }.getOrNull()
    private fun JsonObject.text(key: String) = (this[key] as? JsonPrimitive)?.content?.trim().orEmpty()
    private fun InsurancePolicyRecord.toJson() = buildJsonObject {
        put("id", id); put("companyId", companyId); put("plate", plate); put("customer", customer)
        put("phone", phone); put("car", car); put("vin", vin); put("expiry", expiry); put("amount", amount)
        put("type", type); put("insurer", insurer)
    }
}

private fun encodePathSegment(value: String) = URLEncoder.encode(value, StandardCharsets.UTF_8.name()).replace("+", "%20")
