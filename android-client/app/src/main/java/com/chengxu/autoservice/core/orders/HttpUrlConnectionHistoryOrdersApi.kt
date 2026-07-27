package com.chengxu.autoservice.core.orders

import kotlinx.coroutines.CancellationException
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonObject
import java.io.IOException
import java.net.URLEncoder
import java.nio.charset.StandardCharsets
import java.time.LocalDate

class HttpUrlConnectionHistoryOrdersApi(
    apiOrigin: String,
    private val transport: OrdersHttpTransport = UrlConnectionOrdersHttpTransport(),
    private val json: Json = Json { ignoreUnknownKeys = true },
    private val currentYear: () -> Int = { LocalDate.now().year },
) : HistoryOrdersApi {
    private val ordersUrl = "${apiOrigin.trimEnd('/')}/api/orders"

    override suspend fun fetch(token: String, cursor: String?): HistoryOrdersResult = try {
        val response = transport.get(historyUrl(cursor), "Bearer $token")
        when (response.status) {
            200 -> mapSuccess(response.body)
            401 -> HistoryOrdersResult.Failure(OrdersFailure.Unauthorized)
            else -> HistoryOrdersResult.Failure(OrdersFailure.ServerError)
        }
    } catch (cancellation: CancellationException) {
        throw cancellation
    } catch (_: IOException) {
        HistoryOrdersResult.Failure(OrdersFailure.NetworkUnavailable)
    } catch (_: Exception) {
        HistoryOrdersResult.Failure(OrdersFailure.MalformedResponse)
    }

    private fun historyUrl(cursor: String?): String = buildString {
        append(ordersUrl)
        append("?scope=history")
        cursor?.takeIf(String::isNotBlank)?.let {
            append("&cursor=")
            append(URLEncoder.encode(it, StandardCharsets.UTF_8))
        }
    }

    private fun mapSuccess(body: String): HistoryOrdersResult = try {
        val envelope = json.parseToJsonElement(body).jsonObject
        val orders = envelope["orders"] as? JsonArray
            ?: return HistoryOrdersResult.Failure(OrdersFailure.MalformedResponse)
        HistoryOrdersResult.Success(
            orders = orders.mapNotNull { it.asOrderSummaryOrNull(currentYear()) },
            nextCursor = envelope.optionalString("nextCursor"),
        )
    } catch (_: Exception) {
        HistoryOrdersResult.Failure(OrdersFailure.MalformedResponse)
    }
}

private fun JsonObject.optionalString(key: String): String? {
    val primitive = this[key] as? JsonPrimitive ?: return null
    return primitive.takeIf { it.isString }?.content?.trim()?.takeIf(String::isNotEmpty)
}
