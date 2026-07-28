package com.chengxu.autoservice.core.orders

import com.chengxu.autoservice.core.orders.model.OrderCommandResult
import com.chengxu.autoservice.core.orders.model.OrderDetail
import com.chengxu.autoservice.core.orders.model.ReceiptReference
import com.chengxu.autoservice.core.orders.model.SettlementCommand
import kotlinx.coroutines.CancellationException
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import java.io.IOException
import java.net.URLEncoder
import java.nio.charset.StandardCharsets
import java.time.LocalDate

class HttpUrlConnectionOrderSettlementApi(
    apiOrigin: String,
    private val transport: OrderStatusHttpTransport = UrlConnectionOrderStatusHttpTransport(),
    private val json: Json = Json { ignoreUnknownKeys = true },
    private val currentYear: () -> Int = { LocalDate.now().year },
) : OrderSettlementApi {
    private val ordersUrl = "${apiOrigin.trimEnd('/')}/api/orders"

    override suspend fun settle(token: String, orderId: String, command: SettlementCommand): OrderCommandResult<OrderDetail> = request(command.operationId) {
        transport.post("$ordersUrl/${encode(orderId)}/settlement", "Bearer $token", buildJsonObject {
            put("operationId", command.operationId); put("expectedVersion", command.expectedVersion)
            put("paymentMethod", command.paymentMethod); put("settlementDate", command.settlementDate)
            put("settlementTime", command.settlementTime); put("settlementRemark", command.settlementRemark)
            put("receipt", buildJsonObject {
                put("key", command.receipt.key); put("name", command.receipt.name); put("contentType", command.receipt.contentType)
                put("sizeBytes", command.receipt.sizeBytes); put("uploadedAt", command.receipt.uploadedAt)
            })
        }.toString())
    }

    override suspend fun reverse(token: String, orderId: String, operationId: String, expectedVersion: Long): OrderCommandResult<OrderDetail> = request(operationId) {
        transport.post("$ordersUrl/${encode(orderId)}/reverse-settlement", "Bearer $token", buildJsonObject {
            put("operationId", operationId); put("expectedVersion", expectedVersion)
        }.toString())
    }

    override suspend fun updateReceipt(token: String, orderId: String, operationId: String, expectedVersion: Long, receipt: ReceiptReference?): OrderCommandResult<OrderDetail> = request(operationId) {
        transport.post("$ordersUrl/${encode(orderId)}/receipt", "Bearer $token", buildJsonObject {
            put("operationId", operationId); put("expectedVersion", expectedVersion)
            if (receipt == null) put("receipt", kotlinx.serialization.json.JsonNull) else put("receipt", buildJsonObject {
                put("key", receipt.key); put("name", receipt.name); put("contentType", receipt.contentType); put("sizeBytes", receipt.sizeBytes); put("uploadedAt", receipt.uploadedAt)
            })
        }.toString())
    }

    private suspend fun request(operationId: String, call: suspend () -> OrdersHttpResponse): OrderCommandResult<OrderDetail> = try {
        val response = call()
        when (response.status) {
            200, 201 -> parseOrderDetailEnvelope(response.body, json, currentYear())?.let { OrderCommandResult.Success(it) } ?: OrderCommandResult.UnknownResult(operationId)
            400 -> OrderCommandResult.ValidationFailure(mapOf("command" to "invalid"))
            401 -> OrderCommandResult.Unauthorized
            403 -> OrderCommandResult.Forbidden
            404 -> OrderCommandResult.NotFound
            409 -> if (response.body.contains("OPERATION_IN_PROGRESS")) OrderCommandResult.UnknownResult(operationId)
                else if (response.body.contains("OPERATION_ID_REUSED")) OrderCommandResult.OperationIdReused
                else OrderCommandResult.Conflict(parseOrderDetailEnvelope(response.body, json, currentYear()))
            else -> OrderCommandResult.UnknownResult(operationId)
        }
    } catch (cancellation: CancellationException) { throw cancellation
    } catch (_: IOException) { OrderCommandResult.UnknownResult(operationId)
    } catch (_: Exception) { OrderCommandResult.UnknownResult(operationId) }

    private fun encode(value: String) = URLEncoder.encode(value, StandardCharsets.UTF_8.name()).replace("+", "%20")
}
