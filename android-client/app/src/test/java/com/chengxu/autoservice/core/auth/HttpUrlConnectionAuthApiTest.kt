package com.chengxu.autoservice.core.auth

import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.IOException

class HttpUrlConnectionAuthApiTest {
    @Test
    fun successfulResponseMapsServerSession() = runTest {
        val transport = FakeHttpTransport(
            HttpResponse(
                status = 200,
                body = """{"session":{"token":"token-123","role":"staff","label":"员工","companyId":"tongda","username":"worker","displayName":"通达员工","permissions":["repair"]}}""",
            ),
        )
        val api = HttpUrlConnectionAuthApi("https://chengxu.pages.dev", transport)

        val result = api.login(AuthCredentials("tongda", "worker", "secret12"))

        assertTrue(result is AuthResult.Success)
        assertEquals("token-123", (result as AuthResult.Success).session.token)
        assertEquals("https://chengxu.pages.dev/api/access", transport.lastUrl)
        assertTrue(transport.lastBody.contains("\"password\":\"secret12\""))
    }

    @Test
    fun unauthorizedResponseMapsInvalidCredentials() = runTest {
        val api = HttpUrlConnectionAuthApi(
            "https://chengxu.pages.dev",
            FakeHttpTransport(HttpResponse(401, """{"error":"INVALID_ACCOUNT"}""")),
        )

        assertEquals(
            AuthResult.Failure(AuthFailure.InvalidCredentials),
            api.login(AuthCredentials("tongda", "worker", "wrong")),
        )
    }

    @Test
    fun transportFailureMapsNetworkUnavailable() = runTest {
        val api = HttpUrlConnectionAuthApi(
            "https://chengxu.pages.dev",
            FakeHttpTransport(error = IOException("offline")),
        )

        assertEquals(
            AuthResult.Failure(AuthFailure.NetworkUnavailable),
            api.login(AuthCredentials("tongda", "worker", "secret12")),
        )
    }

    @Test
    fun malformedSuccessResponseMapsMalformedResponse() = runTest {
        val api = HttpUrlConnectionAuthApi(
            "https://chengxu.pages.dev",
            FakeHttpTransport(HttpResponse(200, "{}")),
        )

        assertEquals(
            AuthResult.Failure(AuthFailure.MalformedResponse),
            api.login(AuthCredentials("tongda", "worker", "secret12")),
        )
    }

    @Test
    fun nonAuthenticationServerErrorMapsServerError() = runTest {
        val api = HttpUrlConnectionAuthApi(
            "https://chengxu.pages.dev",
            FakeHttpTransport(HttpResponse(503, """{"error":"UNAVAILABLE"}""")),
        )

        assertEquals(
            AuthResult.Failure(AuthFailure.ServerError),
            api.login(AuthCredentials("tongda", "worker", "secret12")),
        )
    }

    private class FakeHttpTransport(
        private val response: HttpResponse? = null,
        private val error: IOException? = null,
    ) : HttpTransport {
        var lastUrl: String = ""
        var lastBody: String = ""

        override suspend fun postJson(url: String, body: String): HttpResponse {
            lastUrl = url
            lastBody = body
            error?.let { throw it }
            return requireNotNull(response)
        }
    }
}
