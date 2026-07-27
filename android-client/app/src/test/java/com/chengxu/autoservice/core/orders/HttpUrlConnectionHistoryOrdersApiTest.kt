package com.chengxu.autoservice.core.orders

import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test
import java.io.IOException

class HttpUrlConnectionHistoryOrdersApiTest {
    @Test
    fun fetchHistoryPageSendsScopedUrlBearerAndMapsNextCursor() = runTest {
        val transport = FakeOrdersHttpTransport(OrdersHttpResponse(200, historyPageJson))

        val result = HttpUrlConnectionHistoryOrdersApi(
            apiOrigin = "https://chengxu.pages.dev/",
            transport = transport,
            currentYear = { 2026 },
        ).fetch(token = "session-token", cursor = "cursor-2")

        assertEquals(
            "https://chengxu.pages.dev/api/orders?scope=history&cursor=cursor-2",
            transport.url,
        )
        assertEquals("Bearer session-token", transport.authorization)
        assertTrue(result is HistoryOrdersResult.Success)
        val page = result as HistoryOrdersResult.Success
        assertEquals("cursor-3", page.nextCursor)
        assertEquals(listOf("RO-9001"), page.orders.map { it.id })
        assertEquals("tongda", page.orders.single().companyId)
        assertEquals(50_025L, page.orders.single().amountCents)
    }

    @Test
    fun fetchHistoryPageMapsUnauthorizedNetworkAndMalformedResponses() = runTest {
        assertEquals(
            HistoryOrdersResult.Failure(OrdersFailure.Unauthorized),
            apiFor(OrdersHttpResponse(401, "{\"error\":\"SESSION_EXPIRED\"}")).fetch("token", null),
        )
        assertEquals(
            HistoryOrdersResult.Failure(OrdersFailure.MalformedResponse),
            apiFor(OrdersHttpResponse(200, "{not-json")).fetch("token", null),
        )
        assertEquals(
            HistoryOrdersResult.Failure(OrdersFailure.NetworkUnavailable),
            HttpUrlConnectionHistoryOrdersApi(
                apiOrigin = "https://chengxu.pages.dev",
                transport = FakeOrdersHttpTransport(error = IOException("offline")),
            ).fetch("token", null),
        )
    }

    @Test
    fun fetchHistoryPagePropagatesCancellation() = runTest {
        val cancellation = CancellationException("cancelled")
        val api = HttpUrlConnectionHistoryOrdersApi(
            apiOrigin = "https://chengxu.pages.dev",
            transport = FakeOrdersHttpTransport(cancellation = cancellation),
        )

        try {
            api.fetch("token", null)
            fail("Expected cancellation")
        } catch (caught: CancellationException) {
            assertSame(cancellation, caught)
        }
    }

    private fun apiFor(response: OrdersHttpResponse) = HttpUrlConnectionHistoryOrdersApi(
        apiOrigin = "https://chengxu.pages.dev",
        transport = FakeOrdersHttpTransport(response),
        currentYear = { 2026 },
    )

    private class FakeOrdersHttpTransport(
        private val response: OrdersHttpResponse? = null,
        private val error: IOException? = null,
        private val cancellation: CancellationException? = null,
    ) : OrdersHttpTransport {
        var url: String = ""
        var authorization: String = ""

        override suspend fun get(url: String, authorization: String): OrdersHttpResponse {
            this.url = url
            this.authorization = authorization
            cancellation?.let { throw it }
            error?.let { throw it }
            return requireNotNull(response)
        }
    }

    private companion object {
        val historyPageJson = """{
            "orders": [{
                "id": "RO-9001",
                "companyId": "tongda",
                "version": 3,
                "date": "2026-07-17",
                "time": "09:30",
                "plate": "蒙K·A3816",
                "customer": "张先生",
                "car": "大众帕萨特",
                "type": "常规保养",
                "status": "已结算",
                "amountCents": 50025,
                "record": "更换机油与滤芯",
                "insuranceExpiry": "2026-08-01",
                "delivery": "2026-07-18 18:00",
                "updatedAt": "2026-07-18T09:30:00Z"
            }],
            "nextCursor": "cursor-3"
        }""".trimIndent()
    }
}
