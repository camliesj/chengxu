package com.chengxu.autoservice.core.update

import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test
import java.io.IOException

class HttpUrlConnectionAppUpdateApiTest {
    @Test
    fun fetchAcceptsAvailableAndroidHttpsRelease() = runTest {
        val transport = FakeTransport(
            AppUpdateHttpResponse(
                200,
                """{"android":{"available":true,"version":"0.1.1","publishedAt":"2026-07-28","size":"20 MB","notes":"修复工单","downloadUrl":"https://chengxu.pages.dev/downloads/zhiwei-car-service_0.1.1.apk"}}""",
            ),
        )

        val result = HttpUrlConnectionAppUpdateApi("https://chengxu.pages.dev/", transport).fetch()

        assertEquals("https://chengxu.pages.dev/api/client-releases", transport.url)
        assertTrue(result is AppUpdateFetchResult.Success)
        val release = (result as AppUpdateFetchResult.Success).release
        assertEquals("0.1.1", release?.version)
        assertEquals("修复工单", release?.notes)
    }

    @Test
    fun fetchTreatsUnavailableOrUnsafeReleaseAsNoRelease() = runTest {
        val unavailable = HttpUrlConnectionAppUpdateApi("https://x", FakeTransport(AppUpdateHttpResponse(200, """{"android":{"available":false}}"""))).fetch()
        val unsafe = HttpUrlConnectionAppUpdateApi("https://x", FakeTransport(AppUpdateHttpResponse(200, """{"android":{"available":true,"version":"0.1.1","downloadUrl":"http://example.invalid/app.apk"}}"""))).fetch()

        assertNull((unavailable as AppUpdateFetchResult.Success).release)
        assertNull((unsafe as AppUpdateFetchResult.Success).release)
    }

    @Test
    fun fetchMapsFailuresAndPropagatesCancellation() = runTest {
        assertEquals(AppUpdateFetchResult.Failure(AppUpdateFailure.SERVER), api(AppUpdateHttpResponse(503, "")).fetch())
        assertEquals(AppUpdateFetchResult.Failure(AppUpdateFailure.MALFORMED_RESPONSE), api(AppUpdateHttpResponse(200, "not json")).fetch())
        assertEquals(AppUpdateFetchResult.Failure(AppUpdateFailure.NETWORK), HttpUrlConnectionAppUpdateApi("https://x", FakeTransport(error = IOException())).fetch())
        val cancellation = CancellationException("cancel")
        try {
            HttpUrlConnectionAppUpdateApi("https://x", FakeTransport(cancellation = cancellation)).fetch()
            fail("Expected cancellation")
        } catch (caught: CancellationException) {
            assertSame(cancellation, caught)
        }
    }

    private fun api(response: AppUpdateHttpResponse) = HttpUrlConnectionAppUpdateApi("https://x", FakeTransport(response))

    private class FakeTransport(
        private val response: AppUpdateHttpResponse? = null,
        private val error: IOException? = null,
        private val cancellation: CancellationException? = null,
    ) : AppUpdateHttpTransport {
        var url = ""

        override suspend fun get(url: String): AppUpdateHttpResponse {
            this.url = url
            cancellation?.let { throw it }
            error?.let { throw it }
            return requireNotNull(response)
        }
    }
}
