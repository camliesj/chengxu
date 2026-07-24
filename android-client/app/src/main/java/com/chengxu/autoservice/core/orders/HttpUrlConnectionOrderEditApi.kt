package com.chengxu.autoservice.core.orders

import com.chengxu.autoservice.core.orders.model.OrderCommandResult
import com.chengxu.autoservice.core.orders.model.OrderDetail
import com.chengxu.autoservice.core.orders.model.OrderEditCommand
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.nio.charset.StandardCharsets
import java.time.LocalDate

interface OrderEditHttpTransport {
    suspend fun get(url: String, authorization: String): OrdersHttpResponse
    suspend fun patch(url: String, authorization: String, body: String): OrdersHttpResponse
}

class UrlConnectionOrderEditHttpTransport : OrderEditHttpTransport {
    override suspend fun get(url: String, authorization: String): OrdersHttpResponse = request(url, authorization, "GET", null)
    override suspend fun patch(url: String, authorization: String, body: String): OrdersHttpResponse = request(url, authorization, "PATCH", body)

    private suspend fun request(url: String, authorization: String, method: String, body: String?): OrdersHttpResponse =
        withContext(Dispatchers.IO) {
            val connection = (URL(url).openConnection() as HttpURLConnection).apply {
                requestMethod = method
                connectTimeout = TIMEOUT_MILLIS
                readTimeout = TIMEOUT_MILLIS
                setRequestProperty("Accept", "application/json")
                setRequestProperty("Authorization", authorization)
                if (body != null) {
                    doOutput = true
                    setRequestProperty("Content-Type", "application/json; charset=utf-8")
                }
            }
            try {
                body?.let { connection.outputStream.use { stream -> stream.write(it.toByteArray(Charsets.UTF_8)) } }
                val status = connection.responseCode
                val stream = if (status in 200..299) connection.inputStream else connection.errorStream
                OrdersHttpResponse(status, stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty())
            } finally {
                connection.disconnect()
            }
        }

    private companion object { const val TIMEOUT_MILLIS = 10_000 }
}

class HttpUrlConnectionOrderEditApi(
    apiOrigin: String,
    private val transport: OrderEditHttpTransport = UrlConnectionOrderEditHttpTransport(),
    private val json: Json = Json { ignoreUnknownKeys = true },
    private val currentYear: () -> Int = { LocalDate.now().year },
) : OrderEditApi {
    private val ordersUrl = "${apiOrigin.trimEnd('/')}/api/orders"
    private val operationUrl = "${apiOrigin.trimEnd('/')}/api/order-operations/edit-order"

    override suspend fun edit(token: String, orderId: String, command: OrderEditCommand): OrderCommandResult<OrderDetail> {
        val preflight = validate(command)
        if (preflight != null) return preflight
        return safely(command.operationId) {
            val response = transport.patch("$ordersUrl/${encodeEditPathSegment(orderId)}", "Bearer $token", command.toJsonObject().toString())
            when (response.status) {
                200, 201 -> mapDetail(response.body)?.let { OrderCommandResult.Success(it) }
                    ?: OrderCommandResult.UnknownResult(command.operationId)
                400 -> mapValidation(response.body) ?: OrderCommandResult.UnknownResult(command.operationId)
                401 -> OrderCommandResult.Unauthorized
                403 -> OrderCommandResult.Forbidden
                404 -> OrderCommandResult.NotFound
                409 -> mapConflict(response.body, command.operationId)
                in 500..599 -> OrderCommandResult.UnknownResult(command.operationId)
                else -> OrderCommandResult.UnknownResult(command.operationId)
            }
        }
    }

    override suspend fun queryOperation(token: String, operationId: String): OrderCommandResult<OrderDetail> = safely(operationId) {
        val response = transport.get("$operationUrl/${encodeEditPathSegment(operationId)}", "Bearer $token")
        when (response.status) {
            200 -> mapOperation(response.body, operationId)
            401 -> OrderCommandResult.Unauthorized
            403 -> OrderCommandResult.Forbidden
            404 -> OrderCommandResult.NotFound
            409 -> if (errorCode(response.body) == "OPERATION_ID_REUSED") OrderCommandResult.OperationIdReused else OrderCommandResult.UnknownResult(operationId)
            in 500..599 -> OrderCommandResult.UnknownResult(operationId)
            else -> OrderCommandResult.UnknownResult(operationId)
        }
    }

    private fun validate(command: OrderEditCommand): OrderCommandResult.ValidationFailure? = when {
        command.operationId.isBlank() -> OrderCommandResult.ValidationFailure(mapOf("operationId" to "operationId.required"))
        command.expectedVersion <= 0L -> OrderCommandResult.ValidationFailure(mapOf("expectedVersion" to "expectedVersion.required"))
        else -> null
    }

    private suspend fun safely(operationId: String, request: suspend () -> OrderCommandResult<OrderDetail>): OrderCommandResult<OrderDetail> = try {
        request()
    } catch (cancellation: CancellationException) {
        throw cancellation
    } catch (_: IOException) {
        OrderCommandResult.UnknownResult(operationId)
    } catch (_: Exception) {
        OrderCommandResult.UnknownResult(operationId)
    }

    private fun mapDetail(body: String): OrderDetail? = parseOrderDetailEnvelope(body, json, currentYear())

    private fun mapValidation(body: String): OrderCommandResult.ValidationFailure? {
        val envelope = json.parseToJsonElement(body).jsonObject
        if (envelope.string("error") != "VALIDATION_FAILED") return null
        val fieldErrors = envelope["fieldErrors"] as? JsonObject ?: return null
        return OrderCommandResult.ValidationFailure(fieldErrors.mapNotNull { (field, value) ->
            (value as? JsonPrimitive)?.takeIf { it.isString }?.content?.trim()?.takeIf(String::isNotEmpty)?.let { field to it }
        }.toMap())
    }

    private fun mapConflict(body: String, operationId: String): OrderCommandResult<OrderDetail> {
        return when (errorCode(body)) {
            "OPERATION_IN_PROGRESS" -> OrderCommandResult.UnknownResult(operationId)
            "OPERATION_ID_REUSED" -> OrderCommandResult.OperationIdReused
            else -> {
                val envelope = json.parseToJsonElement(body).jsonObject
                val fields = (envelope["conflictingFields"] as? JsonArray).orEmpty().mapNotNull { element ->
                    (element as? JsonPrimitive)?.takeIf { it.isString }?.content?.trim()?.takeIf(String::isNotEmpty)
                }.toSet()
                OrderCommandResult.Conflict(mapDetail(body), fields)
            }
        }
    }

    private fun mapOperation(body: String, operationId: String): OrderCommandResult<OrderDetail> = when (json.parseToJsonElement(body).jsonObject.string("state")) {
        "pending" -> OrderCommandResult.UnknownResult(operationId)
        "completed" -> mapDetail(body)?.let { OrderCommandResult.Success(it) }
            ?: OrderCommandResult.UnknownResult(operationId)
        else -> OrderCommandResult.UnknownResult(operationId)
    }

    private fun errorCode(body: String): String = json.parseToJsonElement(body).jsonObject.string("error")
}

private fun encodeEditPathSegment(value: String): String = URLEncoder.encode(value, StandardCharsets.UTF_8.name()).replace("+", "%20")
