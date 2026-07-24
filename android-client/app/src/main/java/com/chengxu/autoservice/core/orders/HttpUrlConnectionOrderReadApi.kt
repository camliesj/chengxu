package com.chengxu.autoservice.core.orders

import com.chengxu.autoservice.core.orders.model.BusinessCapability
import com.chengxu.autoservice.core.orders.model.OrderDetail
import com.chengxu.autoservice.core.orders.model.OrderDetailEnvelope
import com.chengxu.autoservice.core.orders.model.OrderPage
import com.chengxu.autoservice.core.orders.model.ReceiptMetadata
import kotlinx.coroutines.CancellationException
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.longOrNull
import java.io.IOException
import java.net.URLEncoder
import java.nio.charset.StandardCharsets
import java.time.LocalDate
import java.util.Locale

class HttpUrlConnectionOrderReadApi(
    apiOrigin: String,
    private val transport: OrdersHttpTransport = UrlConnectionOrdersHttpTransport(),
    private val json: Json = Json { ignoreUnknownKeys = true },
    private val currentYear: () -> Int = { LocalDate.now().year },
) : OrderReadApi {
    private val ordersUrl = "${apiOrigin.trimEnd('/')}/api/orders"

    override suspend fun fetchPage(
        token: String,
        query: OrderPageQuery,
    ): OrderReadResult<OrderPage> {
        val parameters = buildList {
            add("scope=${query.scope.name.lowercase(Locale.ROOT)}")
            add("limit=${query.limit}")
            query.cursor?.let { add("cursor=${encodeUrlComponent(it)}") }
                ?: query.updatedAfter?.let { add("updatedAfter=${encodeUrlComponent(it)}") }
        }
        return execute("$ordersUrl?${parameters.joinToString("&")}", token, ::mapPage)
    }

    override suspend fun fetchDetail(
        token: String,
        orderId: String,
    ): OrderReadResult<OrderDetailEnvelope> = execute(
        "$ordersUrl/${encodeUrlComponent(orderId)}",
        token,
        ::mapDetail,
    )

    private suspend fun <T> execute(
        url: String,
        token: String,
        mapper: (String) -> T?,
    ): OrderReadResult<T> = try {
        val response = transport.get(url, "Bearer $token")
        when (response.status) {
            200 -> mapper(response.body)?.let { OrderReadResult.Success(it) }
                ?: OrderReadResult.Failure(OrderReadFailure.MalformedResponse)
            401 -> OrderReadResult.Failure(OrderReadFailure.Unauthorized)
            403 -> OrderReadResult.Failure(OrderReadFailure.Forbidden)
            404 -> OrderReadResult.Failure(OrderReadFailure.NotFound)
            else -> OrderReadResult.Failure(OrderReadFailure.ServerError)
        }
    } catch (cancellation: CancellationException) {
        throw cancellation
    } catch (_: IOException) {
        OrderReadResult.Failure(OrderReadFailure.NetworkUnavailable)
    } catch (_: Exception) {
        OrderReadResult.Failure(OrderReadFailure.MalformedResponse)
    }

    private fun mapPage(body: String): OrderPage? {
        val envelope = json.parseToJsonElement(body).jsonObject
        val orders = envelope["orders"] as? JsonArray ?: return null
        return OrderPage(
            orders = orders.mapNotNull { it.asOrderSummaryOrNull(currentYear()) },
            nextCursor = envelope.stringOrNull("nextCursor"),
            removedOrderIds = envelope.stringArray("removedOrderIds").distinct(),
            serverTime = envelope.string("serverTime"),
            capabilities = envelope.stringArray("capabilities")
                .mapNotNull(::businessCapabilityOrNull)
                .toSet(),
        )
    }

    private fun mapDetail(body: String): OrderDetailEnvelope? {
        val envelope = json.parseToJsonElement(body).jsonObject
        return parseOrderDetailEnvelope(body, json, currentYear())?.let { order ->
            OrderDetailEnvelope(
                order = order,
                capabilities = envelope.stringArray("capabilities")
                    .mapNotNull(::businessCapabilityOrNull).toSet(),
                serverTime = envelope.string("serverTime"),
            )
        }
    }
}

internal fun parseOrderDetailEnvelope(
    body: String,
    json: Json,
    currentYear: Int,
): OrderDetail? {
    val envelope = json.parseToJsonElement(body).jsonObject
    val order = envelope["order"] as? JsonObject ?: return null
    val summary = order.asOrderSummaryOrNull(currentYear) ?: return null
    return OrderDetail(
            summary = summary,
            phone = order.string("phone"),
            insurer = order.string("insurer"),
            staff = order.string("staff"),
            vin = order.string("vin"),
            claimNo = order.string("claimNo"),
            accidentType = order.string("accidentType"),
            paymentMethod = order.string("paymentMethod"),
            remark = order.string("remark"),
            laborCents = order.moneyCents("laborCents", "labor"),
            materialCents = order.moneyCents("materialCents", "material"),
            settlementDate = order.string("settlementDate"),
            settlementTime = order.string("settlementTime"),
            settlementRemark = order.string("settlementRemark"),
            receipt = order.receiptOrNull(),
            voided = order.boolean("voided"),
            voidedAt = order.string("voidedAt"),
            voidReason = order.string("voidReason"),
        )
}

private fun encodeUrlComponent(value: String): String =
    URLEncoder.encode(value, StandardCharsets.UTF_8.name()).replace("+", "%20")

private fun JsonObject.stringOrNull(key: String): String? =
    string(key).takeIf(String::isNotEmpty)

private fun JsonObject.stringArray(key: String): List<String> =
    (this[key] as? JsonArray).orEmpty().mapNotNull(JsonElement::nonBlankStringOrNull)

private fun JsonElement.nonBlankStringOrNull(): String? {
    val primitive = this as? JsonPrimitive ?: return null
    if (!primitive.isString) return null
    return primitive.content.trim().takeIf(String::isNotEmpty)
}

private fun businessCapabilityOrNull(value: String): BusinessCapability? =
    runCatching { BusinessCapability.valueOf(value) }.getOrNull()

private fun JsonObject.receiptOrNull(): ReceiptMetadata? {
    val receipt = this["receipt"] as? JsonObject ?: return null
    return ReceiptMetadata(
        name = receipt.string("name"),
        contentType = receipt.string("contentType"),
        sizeBytes = receipt.nonNegativeLong("sizeBytes") ?: 0L,
        uploadedAt = receipt.string("uploadedAt"),
    )
}

private fun JsonObject.boolean(key: String): Boolean {
    val primitive = this[key] as? JsonPrimitive ?: return false
    return primitive.booleanOrNull ?: (primitive.longOrNull == 1L)
}
