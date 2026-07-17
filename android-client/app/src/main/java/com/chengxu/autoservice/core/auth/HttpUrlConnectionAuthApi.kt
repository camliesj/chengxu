package com.chengxu.autoservice.core.auth

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL

data class HttpResponse(val status: Int, val body: String)

interface HttpTransport {
    suspend fun postJson(url: String, body: String): HttpResponse
}

class UrlConnectionHttpTransport : HttpTransport {
    override suspend fun postJson(url: String, body: String): HttpResponse = withContext(Dispatchers.IO) {
        val connection = (URL(url).openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = TIMEOUT_MILLIS
            readTimeout = TIMEOUT_MILLIS
            doOutput = true
            setRequestProperty("Content-Type", "application/json; charset=utf-8")
        }
        try {
            connection.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }
            val status = connection.responseCode
            val stream = if (status in 200..299) connection.inputStream else connection.errorStream
            HttpResponse(status, stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty())
        } finally {
            connection.disconnect()
        }
    }

    private companion object { const val TIMEOUT_MILLIS = 10_000 }
}

class HttpUrlConnectionAuthApi(
    apiOrigin: String,
    private val transport: HttpTransport = UrlConnectionHttpTransport(),
    private val json: Json = Json { ignoreUnknownKeys = true },
) : AuthApi {
    private val accessUrl = "${apiOrigin.trimEnd('/')}/api/access"

    override suspend fun login(credentials: AuthCredentials): AuthResult = try {
        val request = AccessRequest(credentials.companyId, credentials.username, credentials.password)
        val response = transport.postJson(accessUrl, json.encodeToString(request))
        when {
            response.status == 200 -> runCatching {
                AuthResult.Success(json.decodeFromString<AccessResponse>(response.body).session)
            }.getOrElse { AuthResult.Failure(AuthFailure.MalformedResponse) }
            response.status == 401 -> AuthResult.Failure(AuthFailure.InvalidCredentials)
            else -> AuthResult.Failure(AuthFailure.ServerError)
        }
    } catch (_: IOException) {
        AuthResult.Failure(AuthFailure.NetworkUnavailable)
    }
}

@Serializable
private data class AccessRequest(val companyId: String, val username: String, val password: String)

@Serializable
private data class AccessResponse(val session: RemoteSession)
