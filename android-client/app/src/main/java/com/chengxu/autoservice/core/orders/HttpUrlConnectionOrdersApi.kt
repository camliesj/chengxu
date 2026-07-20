package com.chengxu.autoservice.core.orders

import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.time.LocalDate

data class OrdersHttpResponse(val status: Int, val body: String)

interface OrdersHttpTransport {
    suspend fun get(url: String, authorization: String): OrdersHttpResponse
}

class UrlConnectionOrdersHttpTransport : OrdersHttpTransport {
    override suspend fun get(url: String, authorization: String): OrdersHttpResponse =
        withContext(Dispatchers.IO) {
            val connection = (URL(url).openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                connectTimeout = TIMEOUT_MILLIS
                readTimeout = TIMEOUT_MILLIS
                setRequestProperty("Accept", "application/json")
                setRequestProperty("Authorization", authorization)
            }
            try {
                val status = connection.responseCode
                val stream = if (status in 200..299) connection.inputStream else connection.errorStream
                OrdersHttpResponse(
                    status = status,
                    body = stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty(),
                )
            } finally {
                connection.disconnect()
            }
        }

    private companion object {
        const val TIMEOUT_MILLIS = 10_000
    }
}

class HttpUrlConnectionOrdersApi(
    apiOrigin: String,
    private val transport: OrdersHttpTransport = UrlConnectionOrdersHttpTransport(),
    private val json: Json = Json { ignoreUnknownKeys = true },
    private val currentYear: () -> Int = { LocalDate.now().year },
) : OrdersApi {
    private val ordersUrl = "${apiOrigin.trimEnd('/')}/api/orders"

    override suspend fun fetch(token: String): OrdersResult = try {
        val response = transport.get(ordersUrl, "Bearer $token")
        when (response.status) {
            200 -> mapSuccess(response.body)
            401 -> OrdersResult.Failure(OrdersFailure.Unauthorized)
            else -> OrdersResult.Failure(OrdersFailure.ServerError)
        }
    } catch (cancellation: CancellationException) {
        throw cancellation
    } catch (_: IOException) {
        OrdersResult.Failure(OrdersFailure.NetworkUnavailable)
    } catch (_: Exception) {
        OrdersResult.Failure(OrdersFailure.MalformedResponse)
    }

    private fun mapSuccess(body: String): OrdersResult = try {
        val envelope = json.parseToJsonElement(body).jsonObject
        val orders = envelope["orders"] as? JsonArray
            ?: return OrdersResult.Failure(OrdersFailure.MalformedResponse)
        OrdersResult.Success(
            orders.mapNotNull { element -> element.asOrderOrNull(currentYear()) },
        )
    } catch (_: Exception) {
        OrdersResult.Failure(OrdersFailure.MalformedResponse)
    }
}

private fun JsonElement.asOrderOrNull(currentYear: Int): RepairOrder? {
    val order = this as? JsonObject ?: return null
    val id = order.string("id")
    if (id.isBlank()) return null
    val date = order.string("date")
    return RepairOrder(
        id = id,
        companyId = order.string("companyId"),
        date = date,
        dateSortKey = normalizedDateSortKey(date, currentYear),
        time = order.string("time"),
        plate = order.string("plate"),
        customer = order.string("customer"),
        car = order.string("car"),
        type = order.string("type"),
        status = order.string("status"),
        amountCents = amountToCents(order.primitiveContent("amount")),
        record = order.string("record"),
        insuranceExpiry = order.string("insuranceExpiry"),
        delivery = order.string("delivery"),
    )
}

private fun JsonObject.string(key: String): String {
    val primitive = this[key] as? JsonPrimitive ?: return ""
    return primitive.takeIf { it.isString }?.content.orEmpty().trim()
}

private fun JsonObject.primitiveContent(key: String): String {
    val primitive = this[key] as? JsonPrimitive ?: return ""
    return primitive.content
}
