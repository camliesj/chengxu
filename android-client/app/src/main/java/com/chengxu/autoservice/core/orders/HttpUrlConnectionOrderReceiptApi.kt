package com.chengxu.autoservice.core.orders

import com.chengxu.autoservice.core.orders.model.ReceiptMetadata
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.longOrNull
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.nio.charset.StandardCharsets
import java.util.UUID

data class ReceiptHttpResponse(
    val status: Int,
    val body: String,
    val contentType: String = "application/json",
    val bytes: ByteArray = body.toByteArray(Charsets.UTF_8),
)

interface OrderReceiptHttpTransport {
    suspend fun upload(url: String, authorization: String, orderId: String, upload: ReceiptUpload): ReceiptHttpResponse
    suspend fun download(url: String, authorization: String): ReceiptHttpResponse
    suspend fun delete(url: String, authorization: String, key: String, orderId: String): ReceiptHttpResponse
}

class UrlConnectionOrderReceiptHttpTransport : OrderReceiptHttpTransport {
    override suspend fun upload(url: String, authorization: String, orderId: String, upload: ReceiptUpload): ReceiptHttpResponse =
        withContext(Dispatchers.IO) {
            val boundary = "----Autoservice${UUID.randomUUID()}"
            val connection = connection(url, authorization, "POST").apply {
                doOutput = true
                setRequestProperty("Content-Type", "multipart/form-data; boundary=$boundary")
            }
            try {
                connection.outputStream.use { output ->
                    fun writeText(value: String) = output.write(value.toByteArray(Charsets.UTF_8))
                    writeText("--$boundary\r\nContent-Disposition: form-data; name=\"orderId\"\r\n\r\n$orderId\r\n")
                    val safeName = upload.name.replace('"', '_').replace('\r', '_').replace('\n', '_')
                    writeText("--$boundary\r\nContent-Disposition: form-data; name=\"file\"; filename=\"$safeName\"\r\nContent-Type: ${upload.contentType}\r\n\r\n")
                    output.write(upload.bytes)
                    writeText("\r\n--$boundary--\r\n")
                }
                response(connection)
            } finally {
                connection.disconnect()
            }
        }

    override suspend fun download(url: String, authorization: String): ReceiptHttpResponse = request(url, authorization, "GET")

    override suspend fun delete(url: String, authorization: String, key: String, orderId: String): ReceiptHttpResponse =
        request(url, authorization, "DELETE", "{\"key\":\"${escapeJson(key)}\",\"orderId\":\"${escapeJson(orderId)}\"}")

    private suspend fun request(url: String, authorization: String, method: String, body: String? = null): ReceiptHttpResponse =
        withContext(Dispatchers.IO) {
            val connection = connection(url, authorization, method).apply {
                if (body != null) {
                    doOutput = true
                    setRequestProperty("Content-Type", "application/json; charset=utf-8")
                }
            }
            try {
                body?.let { connection.outputStream.use { output -> output.write(it.toByteArray(Charsets.UTF_8)) } }
                response(connection)
            } finally {
                connection.disconnect()
            }
        }

    private fun connection(url: String, authorization: String, method: String) =
        (URL(url).openConnection() as HttpURLConnection).apply {
            requestMethod = method
            connectTimeout = TIMEOUT_MILLIS
            readTimeout = TIMEOUT_MILLIS
            setRequestProperty("Accept", "application/json")
            setRequestProperty("Authorization", authorization)
        }

    private fun response(connection: HttpURLConnection): ReceiptHttpResponse {
        val status = connection.responseCode
        val stream = if (status in 200..299) connection.inputStream else connection.errorStream
        val bytes = stream?.use { it.readBytes() } ?: ByteArray(0)
        return ReceiptHttpResponse(status, bytes.toString(Charsets.UTF_8), connection.contentType.orEmpty(), bytes)
    }

    private companion object {
        const val TIMEOUT_MILLIS = 10_000
        fun escapeJson(value: String) = value.replace("\\", "\\\\").replace("\"", "\\\"")
    }
}

class HttpUrlConnectionOrderReceiptApi(
    apiOrigin: String,
    private val transport: OrderReceiptHttpTransport = UrlConnectionOrderReceiptHttpTransport(),
    private val json: Json = Json { ignoreUnknownKeys = true },
) : OrderReceiptApi {
    private val receiptsUrl = "${apiOrigin.trimEnd('/')}/api/receipts"

    override suspend fun upload(token: String, orderId: String, upload: ReceiptUpload): ReceiptOperationResult<ReceiptMetadata> {
        val invalid = validateUpload(orderId, upload)
        if (invalid != null) return invalid
        return safely {
            val response = transport.upload(receiptsUrl, "Bearer $token", orderId, upload)
            when (response.status) {
                200, 201 -> parseReceipt(response.body)?.let { ReceiptOperationResult.Success(it) } ?: ReceiptOperationResult.MalformedResponse
                else -> mapFailure(response.status, response.body)
            }
        }
    }

    override suspend fun download(token: String, key: String): ReceiptOperationResult<ReceiptDownload> {
        if (key.isBlank()) return ReceiptOperationResult.ValidationFailure("key.required")
        return safely {
            val response = transport.download("$receiptsUrl?key=${encode(key)}", "Bearer $token")
            when (response.status) {
                200 -> ReceiptOperationResult.Success(ReceiptDownload(response.contentType.ifBlank { "application/octet-stream" }, response.bytes))
                else -> mapFailure(response.status, response.body)
            }
        }
    }

    override suspend fun delete(token: String, key: String, orderId: String): ReceiptOperationResult<Unit> {
        if (key.isBlank() || orderId.isBlank()) return ReceiptOperationResult.ValidationFailure("key_or_order.required")
        return safely {
            val response = transport.delete(receiptsUrl, "Bearer $token", key, orderId)
            when (response.status) {
                200, 204 -> ReceiptOperationResult.Success(Unit)
                else -> mapFailure(response.status, response.body)
            }
        }
    }

    private fun validateUpload(orderId: String, upload: ReceiptUpload): ReceiptOperationResult<Nothing>? = when {
        orderId.isBlank() -> ReceiptOperationResult.ValidationFailure("orderId.required")
        upload.name.isBlank() -> ReceiptOperationResult.ValidationFailure("file.required")
        upload.contentType !in ALLOWED_TYPES -> ReceiptOperationResult.ValidationFailure("file.unsupported_type")
        upload.bytes.isEmpty() || upload.bytes.size > MAX_RECEIPT_BYTES -> ReceiptOperationResult.ValidationFailure("file.too_large")
        else -> null
    }

    private suspend fun <T> safely(block: suspend () -> ReceiptOperationResult<T>): ReceiptOperationResult<T> = try {
        block()
    } catch (cancellation: CancellationException) {
        throw cancellation
    } catch (_: IOException) {
        ReceiptOperationResult.NetworkUnavailable
    } catch (_: Exception) {
        ReceiptOperationResult.MalformedResponse
    }

    private fun <T> mapFailure(status: Int, body: String): ReceiptOperationResult<T> = when (status) {
        400 -> ReceiptOperationResult.ValidationFailure(errorCode(body).ifBlank { "invalid" })
        401 -> ReceiptOperationResult.Unauthorized
        403 -> ReceiptOperationResult.Forbidden
        404 -> ReceiptOperationResult.NotFound
        else -> ReceiptOperationResult.MalformedResponse
    }

    private fun parseReceipt(body: String): ReceiptMetadata? = runCatching {
        val receipt = json.parseToJsonElement(body).jsonObject["receipt"]?.jsonObject ?: return null
        val key = receipt.string("key").takeIf(String::isNotBlank) ?: return null
        val type = receipt.string("type").takeIf(String::isNotBlank) ?: return null
        val size = receipt["size"]?.jsonPrimitive?.longOrNull?.takeIf { it >= 0 } ?: return null
        ReceiptMetadata(key, receipt.string("name"), type, size, receipt.string("uploadedAt"))
    }.getOrNull()

    private fun errorCode(body: String): String = runCatching { json.parseToJsonElement(body).jsonObject.string("error") }.getOrDefault("")
    private fun encode(value: String) = URLEncoder.encode(value, StandardCharsets.UTF_8.name()).replace("+", "%20")

    private companion object {
        val ALLOWED_TYPES = setOf("image/jpeg", "image/png", "image/webp")
        const val MAX_RECEIPT_BYTES = 12 * 1024 * 1024
    }
}
