package com.chengxu.autoservice.core.orders

import com.chengxu.autoservice.core.orders.model.OrderCommandResult
import com.chengxu.autoservice.core.orders.model.OrderDetail
import com.chengxu.autoservice.core.orders.model.OrderStatus
import com.chengxu.autoservice.core.orders.model.OrderStatusCommand
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.put
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.nio.charset.StandardCharsets
import java.time.LocalDate

interface OrderStatusHttpTransport {
    suspend fun get(url: String, authorization: String): OrdersHttpResponse
    suspend fun post(url: String, authorization: String, body: String): OrdersHttpResponse
}

class UrlConnectionOrderStatusHttpTransport : OrderStatusHttpTransport {
    override suspend fun get(url: String, authorization: String): OrdersHttpResponse = request(url, authorization, "GET", null)
    override suspend fun post(url: String, authorization: String, body: String): OrdersHttpResponse = request(url, authorization, "POST", body)

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

class HttpUrlConnectionOrderStatusApi(
    apiOrigin: String,
    private val transport: OrderStatusHttpTransport = UrlConnectionOrderStatusHttpTransport(),
    private val json: Json = Json { ignoreUnknownKeys = true },
    private val currentYear: () -> Int = { LocalDate.now().year },
) : OrderStatusApi {
    private val ordersUrl = "${apiOrigin.trimEnd('/')}/api/orders"
    private val operationUrl = "${apiOrigin.trimEnd('/')}/api/order-operations/change-order-status"

    override suspend fun change(token: String, orderId: String, command: OrderStatusCommand): OrderCommandResult<OrderDetail> {
        val preflight = validate(command)
        if (preflight != null) return preflight
        return safely(command.operationId) {
            val response = transport.post(
                "$ordersUrl/${encodeStatusPathSegment(orderId)}/status",
                "Bearer $token",
                buildJsonObject {
                    put("operationId", command.operationId)
                    put("expectedVersion", command.expectedVersion)
                    put("targetStatus", command.targetStatus.wireValue)
                }.toString(),
            )
            when (response.status) {
                200, 201 -> mapDetail(response.body)?.let { OrderCommandResult.Success(it) }
                    ?: OrderCommandResult.UnknownResult(command.operationId)
                400 -> OrderCommandResult.ValidationFailure(mapOf("command" to errorCode(response.body).ifBlank { "invalid" }))
                401 -> OrderCommandResult.Unauthorized
                403 -> OrderCommandResult.Forbidden
                404 -> OrderCommandResult.NotFound
                409 -> mapConflict(response.body, command.operationId)
                else -> OrderCommandResult.UnknownResult(command.operationId)
            }
        }
    }

    override suspend fun queryOperation(token: String, operationId: String): OrderCommandResult<OrderDetail> = safely(operationId) {
        val response = transport.get("$operationUrl/${encodeStatusPathSegment(operationId)}", "Bearer $token")
        when (response.status) {
            200 -> mapOperation(response.body, operationId)
            401 -> OrderCommandResult.Unauthorized
            403 -> OrderCommandResult.Forbidden
            404 -> OrderCommandResult.NotFound
            409 -> if (errorCode(response.body) == "OPERATION_ID_REUSED") OrderCommandResult.OperationIdReused else OrderCommandResult.UnknownResult(operationId)
            else -> OrderCommandResult.UnknownResult(operationId)
        }
    }

    private fun validate(command: OrderStatusCommand): OrderCommandResult.ValidationFailure? = when {
        command.operationId.isBlank() -> OrderCommandResult.ValidationFailure(mapOf("operationId" to "operationId.required"))
        command.expectedVersion <= 0L -> OrderCommandResult.ValidationFailure(mapOf("expectedVersion" to "expectedVersion.required"))
        command.targetStatus == OrderStatus.SETTLED -> OrderCommandResult.ValidationFailure(mapOf("targetStatus" to "targetStatus.invalid"))
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

    private fun mapConflict(body: String, operationId: String): OrderCommandResult<OrderDetail> = when (errorCode(body)) {
        "OPERATION_IN_PROGRESS" -> OrderCommandResult.UnknownResult(operationId)
        "OPERATION_ID_REUSED" -> OrderCommandResult.OperationIdReused
        else -> OrderCommandResult.Conflict(mapDetail(body))
    }

    private fun mapOperation(body: String, operationId: String): OrderCommandResult<OrderDetail> = when (json.parseToJsonElement(body).jsonObject.string("state")) {
        "pending" -> OrderCommandResult.UnknownResult(operationId)
        "completed" -> mapDetail(body)?.let { OrderCommandResult.Success(it) }
            ?: OrderCommandResult.UnknownResult(operationId)
        else -> OrderCommandResult.UnknownResult(operationId)
    }

    private fun errorCode(body: String): String = runCatching {
        json.parseToJsonElement(body).jsonObject.string("error")
    }.getOrDefault("")
}

private fun encodeStatusPathSegment(value: String): String = URLEncoder.encode(value, StandardCharsets.UTF_8.name()).replace("+", "%20")
