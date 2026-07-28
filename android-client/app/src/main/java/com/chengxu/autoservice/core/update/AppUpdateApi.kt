package com.chengxu.autoservice.core.update

import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.jsonObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL

data class AppUpdateRelease(
    val version: String,
    val publishedAt: String,
    val size: String,
    val notes: String,
    val downloadUrl: String,
)

enum class AppUpdateFailure { NETWORK, SERVER, MALFORMED_RESPONSE }

sealed interface AppUpdateFetchResult {
    data class Success(val release: AppUpdateRelease?) : AppUpdateFetchResult
    data class Failure(val reason: AppUpdateFailure) : AppUpdateFetchResult
}

interface AppUpdateApi {
    suspend fun fetch(): AppUpdateFetchResult
}

data class AppUpdateHttpResponse(val status: Int, val body: String)

interface AppUpdateHttpTransport {
    suspend fun get(url: String): AppUpdateHttpResponse
}

class UrlConnectionAppUpdateHttpTransport : AppUpdateHttpTransport {
    override suspend fun get(url: String): AppUpdateHttpResponse = withContext(Dispatchers.IO) {
        val connection = (URL(url).openConnection() as HttpURLConnection).apply {
            requestMethod = "GET"
            connectTimeout = 10_000
            readTimeout = 10_000
            setRequestProperty("Accept", "application/json")
        }
        try {
            val status = connection.responseCode
            val stream = if (status in 200..299) connection.inputStream else connection.errorStream
            AppUpdateHttpResponse(status, stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty())
        } finally {
            connection.disconnect()
        }
    }
}

class HttpUrlConnectionAppUpdateApi(
    apiOrigin: String,
    private val transport: AppUpdateHttpTransport = UrlConnectionAppUpdateHttpTransport(),
) : AppUpdateApi {
    private val url = "${apiOrigin.trimEnd('/')}/api/client-releases"

    override suspend fun fetch(): AppUpdateFetchResult = try {
        val response = transport.get(url)
        when (response.status) {
            200 -> parse(response.body)
            else -> AppUpdateFetchResult.Failure(AppUpdateFailure.SERVER)
        }
    } catch (cancelled: CancellationException) {
        throw cancelled
    } catch (_: IOException) {
        AppUpdateFetchResult.Failure(AppUpdateFailure.NETWORK)
    } catch (_: Exception) {
        AppUpdateFetchResult.Failure(AppUpdateFailure.MALFORMED_RESPONSE)
    }

    private fun parse(body: String): AppUpdateFetchResult = try {
        val android = Json.parseToJsonElement(body).jsonObject["android"] as? JsonObject
            ?: return AppUpdateFetchResult.Failure(AppUpdateFailure.MALFORMED_RESPONSE)
        if (android.boolean("available") != true) return AppUpdateFetchResult.Success(null)
        val version = android.text("version")
        val downloadUrl = android.text("downloadUrl")
        if (!AppUpdateVersion.isValid(version) || !isHttps(downloadUrl)) return AppUpdateFetchResult.Success(null)
        AppUpdateFetchResult.Success(
            AppUpdateRelease(
                version = version,
                publishedAt = android.text("publishedAt"),
                size = android.text("size"),
                notes = android.text("notes"),
                downloadUrl = downloadUrl,
            ),
        )
    } catch (_: Exception) {
        AppUpdateFetchResult.Failure(AppUpdateFailure.MALFORMED_RESPONSE)
    }

    private fun JsonObject.text(key: String): String = (this[key] as? JsonPrimitive)?.content?.trim().orEmpty()
    private fun JsonObject.boolean(key: String): Boolean? = (this[key] as? JsonPrimitive)?.booleanOrNull

    private fun isHttps(value: String): Boolean = runCatching {
        URL(value).protocol.equals("https", ignoreCase = true) && URL(value).host.isNotBlank()
    }.getOrDefault(false)
}
