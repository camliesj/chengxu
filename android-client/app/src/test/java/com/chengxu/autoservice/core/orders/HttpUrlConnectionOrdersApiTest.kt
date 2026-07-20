package com.chengxu.autoservice.core.orders

import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test
import java.io.IOException

class HttpUrlConnectionOrdersApiTest {
    @Test
    fun successMapsOrdersAndSendsBearerToken() = runTest {
        val transport = FakeOrdersHttpTransport(OrdersHttpResponse(200, successJson))
        val result = HttpUrlConnectionOrdersApi(
            apiOrigin = "https://chengxu.pages.dev/",
            transport = transport,
            currentYear = { 2026 },
        ).fetch("session-token")

        assertEquals("https://chengxu.pages.dev/api/orders", transport.url)
        assertEquals("Bearer session-token", transport.authorization)
        assertTrue(result is OrdersResult.Success)
        val order = (result as OrdersResult.Success).orders.single()
        assertEquals("RO-1001", order.id)
        assertEquals("2026-07-17", order.dateSortKey)
        assertEquals(50_025L, order.amountCents)
        assertEquals("更换机油与滤芯", order.record)
    }

    @Test
    fun malformedOptionalFieldsUseSafeDefaultsWithoutDroppingTheOrder() = runTest {
        val transport = FakeOrdersHttpTransport(
            OrdersHttpResponse(
                200,
                """{
                    "orders": [{
                        "id": "RO-1002",
                        "companyId": "tongda",
                        "date": "07-18",
                        "time": 930,
                        "plate": null,
                        "customer": {"unexpected": true},
                        "car": "大众帕萨特",
                        "type": "常规保养",
                        "status": "未知状态",
                        "amount": -12.50,
                        "record": "",
                        "insuranceExpiry": ["bad"],
                        "delivery": null
                    }]
                }""".trimIndent(),
            ),
        )

        val result = HttpUrlConnectionOrdersApi(
            "https://chengxu.pages.dev",
            transport,
            currentYear = { 2026 },
        ).fetch("token") as OrdersResult.Success

        val order = result.orders.single()
        assertEquals("2026-07-18", order.dateSortKey)
        assertEquals("", order.time)
        assertEquals("", order.plate)
        assertEquals("", order.customer)
        assertEquals(0L, order.amountCents)
        assertEquals("", order.insuranceExpiry)
    }

    @Test
    fun invalidDateAndAmountRemainReadableWithEmptySortKeyAndZeroCents() = runTest {
        val body = successJson
            .replace("2026-07-17", "not-a-date")
            .replace("500.25", "\"not-money\"")
        val result = HttpUrlConnectionOrdersApi(
            "https://chengxu.pages.dev",
            FakeOrdersHttpTransport(OrdersHttpResponse(200, body)),
            currentYear = { 2026 },
        ).fetch("token") as OrdersResult.Success

        assertEquals("", result.orders.single().dateSortKey)
        assertEquals(0L, result.orders.single().amountCents)
    }

    @Test
    fun unauthorizedResponseMapsUnauthorized() = runTest {
        val result = apiFor(OrdersHttpResponse(401, """{"error":"SESSION_EXPIRED"}""")).fetch("token")

        assertEquals(OrdersResult.Failure(OrdersFailure.Unauthorized), result)
    }

    @Test
    fun serverErrorMapsServerError() = runTest {
        val result = apiFor(OrdersHttpResponse(503, """{"error":"UNAVAILABLE"}""")).fetch("token")

        assertEquals(OrdersResult.Failure(OrdersFailure.ServerError), result)
    }

    @Test
    fun transportFailureMapsNetworkUnavailable() = runTest {
        val result = HttpUrlConnectionOrdersApi(
            "https://chengxu.pages.dev",
            FakeOrdersHttpTransport(error = IOException("offline")),
        ).fetch("token")

        assertEquals(OrdersResult.Failure(OrdersFailure.NetworkUnavailable), result)
    }

    @Test
    fun malformedSuccessEnvelopeMapsMalformedResponse() = runTest {
        val result = apiFor(OrdersHttpResponse(200, "{not-json")).fetch("token")

        assertEquals(OrdersResult.Failure(OrdersFailure.MalformedResponse), result)
    }

    @Test
    fun cancellationPropagatesWithoutBusinessMapping() = runTest {
        val cancellation = CancellationException("cancelled")
        val api = HttpUrlConnectionOrdersApi(
            "https://chengxu.pages.dev",
            FakeOrdersHttpTransport(cancellation = cancellation),
        )

        try {
            api.fetch("token")
            fail("Expected cancellation")
        } catch (caught: CancellationException) {
            assertSame(cancellation, caught)
        }
    }

    private fun apiFor(response: OrdersHttpResponse) = HttpUrlConnectionOrdersApi(
        "https://chengxu.pages.dev",
        FakeOrdersHttpTransport(response),
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
        val successJson = """{
            "orders": [{
                "id": "RO-1001",
                "companyId": "tongda",
                "date": "2026-07-17",
                "time": "09:30",
                "plate": "蒙K·A3816",
                "customer": "张先生",
                "car": "大众帕萨特",
                "type": "常规保养",
                "status": "在修中",
                "amount": 500.25,
                "record": "更换机油与滤芯",
                "insuranceExpiry": "2026-08-01",
                "delivery": "2026-07-18 18:00",
                "unknownField": "ignored"
            }]
        }""".trimIndent()
    }
}
