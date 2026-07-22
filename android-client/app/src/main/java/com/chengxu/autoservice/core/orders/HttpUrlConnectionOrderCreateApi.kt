package com.chengxu.autoservice.core.orders

import com.chengxu.autoservice.core.orders.model.BusinessCapability
import com.chengxu.autoservice.core.orders.model.OrderCommandResult
import com.chengxu.autoservice.core.orders.model.OrderCreateCommand
import com.chengxu.autoservice.core.orders.model.OrderCreationDefaults
import com.chengxu.autoservice.core.orders.model.OrderCreationMetadata
import com.chengxu.autoservice.core.orders.model.OrderCreationMetadataEnvelope
import com.chengxu.autoservice.core.orders.model.OrderCreationOptions
import com.chengxu.autoservice.core.orders.model.OrderCreationStaff
import com.chengxu.autoservice.core.orders.model.OrderDetail
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.jsonObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.nio.charset.StandardCharsets
import java.time.LocalDate

interface OrderCreateHttpTransport {
    suspend fun get(url: String, authorization: String): OrdersHttpResponse
    suspend fun post(url: String, authorization: String, body: String): OrdersHttpResponse
}

class UrlConnectionOrderCreateHttpTransport : OrderCreateHttpTransport {
    override suspend fun get(url: String, authorization: String): OrdersHttpResponse =
        request(url, authorization, "GET", null)

    override suspend fun post(
        url: String,
        authorization: String,
        body: String,
    ): OrdersHttpResponse = request(url, authorization, "POST", body)

    private suspend fun request(
        url: String,
        authorization: String,
        method: String,
        body: String?,
    ): OrdersHttpResponse = withContext(Dispatchers.IO) {
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
            if (body != null) {
                connection.outputStream.use { stream -> stream.write(body.toByteArray(Charsets.UTF_8)) }
            }
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

class HttpUrlConnectionOrderCreateApi(
    apiOrigin: String,
    private val transport: OrderCreateHttpTransport = UrlConnectionOrderCreateHttpTransport(),
    private val json: Json = Json { ignoreUnknownKeys = true },
    private val currentYear: () -> Int = { LocalDate.now().year },
) : OrderCreateApi {
    private val metadataUrl = "${apiOrigin.trimEnd('/')}/api/order-creation-metadata"
    private val createUrl = "${apiOrigin.trimEnd('/')}/api/orders/create"
    private val operationUrl = "${apiOrigin.trimEnd('/')}/api/order-operations/create-order"

    override suspend fun fetchMetadata(token: String): OrderCommandResult<OrderCreationMetadataEnvelope> =
        safely {
            val response = transport.get(metadataUrl, bearer(token))
            when (response.status) {
                200 -> mapMetadata(response.body)?.let { OrderCommandResult.Success(it) }
                    ?: OrderCommandResult.MalformedResponse
                401 -> OrderCommandResult.Unauthorized
                403 -> OrderCommandResult.Forbidden
                in 500..599 -> OrderCommandResult.ServerFailure
                else -> OrderCommandResult.MalformedResponse
            }
        }

    override suspend fun create(
        token: String,
        command: OrderCreateCommand,
    ): OrderCommandResult<OrderDetail> = safely {
        val response = transport.post(createUrl, bearer(token), command.toJsonObject().toString())
        when (response.status) {
            200, 201 -> mapOrder(response.body)?.let { OrderCommandResult.Success(it) }
                ?: OrderCommandResult.MalformedResponse
            400 -> mapValidation(response.body) ?: OrderCommandResult.MalformedResponse
            401 -> OrderCommandResult.Unauthorized
            403 -> OrderCommandResult.Forbidden
            409 -> mapConflict(response.body, command.operationId)
            in 500..599 -> OrderCommandResult.ServerFailure
            else -> OrderCommandResult.MalformedResponse
        }
    }

    override suspend fun queryOperation(
        token: String,
        operationId: String,
    ): OrderCommandResult<OrderDetail> = safely {
        val response = transport.get(
            "$operationUrl/${encodePathSegment(operationId)}",
            bearer(token),
        )
        when (response.status) {
            200 -> mapOperation(response.body, operationId)
            401 -> OrderCommandResult.Unauthorized
            403 -> OrderCommandResult.Forbidden
            in 500..599 -> OrderCommandResult.ServerFailure
            else -> OrderCommandResult.MalformedResponse
        }
    }

    private suspend fun <T> safely(
        request: suspend () -> OrderCommandResult<T>,
    ): OrderCommandResult<T> = try {
        request()
    } catch (cancellation: CancellationException) {
        throw cancellation
    } catch (_: IOException) {
        OrderCommandResult.NetworkUnavailable
    } catch (_: Exception) {
        OrderCommandResult.MalformedResponse
    }

    private fun mapMetadata(body: String): OrderCreationMetadataEnvelope? {
        val envelope = json.parseToJsonElement(body).jsonObject
        val metadataObject = envelope["metadata"] as? JsonObject ?: return null
        val defaults = metadataObject["defaults"] as? JsonObject ?: return null
        val options = metadataObject["options"] as? JsonObject ?: return null
        val maxLengthsObject = metadataObject["maxLengths"] as? JsonObject ?: return null
        val contractVersion = metadataObject.nonNegativeLong("contractVersion")
            ?.takeIf { it in 1..Int.MAX_VALUE }?.toInt() ?: return null
        val requiredFields = metadataObject.stringList("requiredFields").toSet()
        if (requiredFields.isEmpty()) return null
        val canCreate = (envelope["canCreate"] as? JsonPrimitive)?.booleanOrNull ?: return null
        val maxLengths = maxLengthsObject.mapNotNull { (field, element) ->
            val value = (element as? JsonPrimitive)?.takeUnless { it.isString }
                ?.content?.toIntOrNull()?.takeIf { it > 0 }
            value?.let { field to it }
        }.toMap()

        return OrderCreationMetadataEnvelope(
            metadata = OrderCreationMetadata(
                contractVersion = contractVersion,
                requiredFields = requiredFields,
                defaults = OrderCreationDefaults(
                    insurer = defaults.string("insurer"),
                    staff = defaults.string("staff"),
                    type = defaults.string("type"),
                    accidentType = defaults.string("accidentType"),
                    delivery = defaults.string("delivery"),
                    laborCents = defaults.nonNegativeLong("laborCents") ?: return null,
                    materialCents = defaults.nonNegativeLong("materialCents") ?: return null,
                    remark = defaults.string("remark"),
                ),
                options = OrderCreationOptions(
                    insurers = options.stringList("insurers"),
                    staff = options.staffList(),
                    vehicleTypes = options.stringList("vehicleTypes"),
                    accidentTypes = options.stringList("accidentTypes"),
                    deliverySuggestions = options.stringList("deliverySuggestions"),
                ),
                maxLengths = maxLengths,
            ),
            capabilities = envelope.stringList("capabilities")
                .mapNotNull { value -> runCatching { BusinessCapability.valueOf(value) }.getOrNull() }
                .toSet(),
            canCreate = canCreate,
            serverTime = envelope.string("serverTime"),
        )
    }

    private fun mapOrder(body: String): OrderDetail? =
        parseOrderDetailEnvelope(body, json, currentYear())

    private fun mapValidation(body: String): OrderCommandResult.ValidationFailure? {
        val envelope = json.parseToJsonElement(body).jsonObject
        if (envelope.string("error") != "VALIDATION_FAILED") return null
        val errors = envelope["fieldErrors"] as? JsonObject ?: return null
        return OrderCommandResult.ValidationFailure(
            errors.mapNotNull { (field, value) ->
                (value as? JsonPrimitive)?.takeIf { it.isString }?.content
                    ?.trim()?.takeIf(String::isNotEmpty)?.let { field to it }
            }.toMap(),
        )
    }

    private fun mapConflict(body: String, operationId: String): OrderCommandResult<OrderDetail> {
        val envelope = json.parseToJsonElement(body).jsonObject
        return if (envelope.string("error") == "OPERATION_IN_PROGRESS") {
            OrderCommandResult.UnknownResult(operationId)
        } else {
            OrderCommandResult.Conflict(parseOrderDetailEnvelope(body, json, currentYear()))
        }
    }

    private fun mapOperation(body: String, operationId: String): OrderCommandResult<OrderDetail> {
        val envelope = json.parseToJsonElement(body).jsonObject
        return when (envelope.string("state")) {
            "pending" -> OrderCommandResult.UnknownResult(operationId)
            "completed" -> parseOrderDetailEnvelope(body, json, currentYear())
                ?.let { OrderCommandResult.Success(it) } ?: OrderCommandResult.MalformedResponse
            else -> OrderCommandResult.MalformedResponse
        }
    }
}

private fun bearer(token: String): String = "Bearer $token"

private fun encodePathSegment(value: String): String =
    URLEncoder.encode(value, StandardCharsets.UTF_8.name()).replace("+", "%20")

private fun JsonObject.stringList(key: String): List<String> =
    (this[key] as? JsonArray).orEmpty().mapNotNull(JsonElement::creationStringOrNull)

private fun JsonElement.creationStringOrNull(): String? =
    (this as? JsonPrimitive)?.takeIf { it.isString }?.content?.trim()?.takeIf(String::isNotEmpty)

private fun JsonObject.staffList(): List<OrderCreationStaff> =
    (this["staff"] as? JsonArray).orEmpty().mapNotNull { element ->
        val item = element as? JsonObject ?: return@mapNotNull null
        val name = item.string("name").takeIf(String::isNotEmpty) ?: return@mapNotNull null
        OrderCreationStaff(id = item.string("id"), name = name, title = item.string("title"))
    }
