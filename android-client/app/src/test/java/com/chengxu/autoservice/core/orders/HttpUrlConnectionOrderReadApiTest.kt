package com.chengxu.autoservice.core.orders

import com.chengxu.autoservice.core.orders.model.BusinessCapability
import com.chengxu.autoservice.core.orders.model.OrderScope
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test
import java.io.IOException

class HttpUrlConnectionOrderReadApiTest {
    @Test
    fun currentCursorPageUsesFixedEncodedUrlAndBearerToken() = runTest {
        val transport = RecordingTransport(OrdersHttpResponse(200, pageJson))
        val result = api(transport).fetchPage(
            token = "session-token",
            query = OrderPageQuery(
                scope = OrderScope.CURRENT,
                cursor = "下一页 +/=",
                limit = 25,
            ),
        )

        assertEquals(
            "https://chengxu.pages.dev/api/orders?scope=current&limit=25&cursor=%E4%B8%8B%E4%B8%80%E9%A1%B5%20%2B%2F%3D",
            transport.url,
        )
        assertEquals("Bearer session-token", transport.authorization)
        assertTrue(result is OrderReadResult.Success)
    }

    @Test
    fun historyDeltaPageEncodesUpdatedAfterWithoutAddingCursor() = runTest {
        val transport = RecordingTransport(OrdersHttpResponse(200, pageJson))
        api(transport).fetchPage(
            token = "token",
            query = OrderPageQuery(
                scope = OrderScope.HISTORY,
                updatedAfter = "2026-07-20T09:00:00Z",
                limit = 100,
            ),
        )

        assertEquals(
            "https://chengxu.pages.dev/api/orders?scope=history&limit=100&updatedAfter=2026-07-20T09%3A00%3A00Z",
            transport.url,
        )
        assertFalse(transport.url.contains("cursor="))
    }

    @Test
    fun pageMapsStrictSummariesTombstonesCapabilitiesAndSafeDefaults() = runTest {
        val result = api(RecordingTransport(OrdersHttpResponse(200, pageJson)))
            .fetchPage("token", OrderPageQuery(OrderScope.CURRENT)) as OrderReadResult.Success

        assertEquals(1, result.value.orders.size)
        val order = result.value.orders.single()
        assertEquals("RO-1001", order.id)
        assertEquals(7L, order.version)
        assertEquals(12_345L, order.amountCents)
        assertEquals("2026-07-20", order.dateSortKey)
        assertEquals(listOf("RO-OLD", "RO-VOID"), result.value.removedOrderIds)
        assertEquals("next-token", result.value.nextCursor)
        assertEquals("2026-07-20T10:30:00.000Z", result.value.serverTime)
        assertEquals(
            setOf(BusinessCapability.VIEW_ORDERS, BusinessCapability.EDIT_ORDER),
            result.value.capabilities,
        )
    }

    @Test
    fun detailEncodesOnePathSegmentAndMapsAllFieldsAndReceiptMetadata() = runTest {
        val transport = RecordingTransport(OrdersHttpResponse(200, detailJson))
        val result = api(transport).fetchDetail("token", "RO/蒙 A") as OrderReadResult.Success

        assertEquals("https://chengxu.pages.dev/api/orders/RO%2F%E8%92%99%20A", transport.url)
        val detail = result.value.order
        assertEquals("15000000000", detail.phone)
        assertEquals("VIN-001", detail.vin)
        assertEquals("CL-001", detail.claimNo)
        assertEquals(10_050L, detail.laborCents)
        assertEquals(20_000L, detail.materialCents)
        assertEquals("receipt.png", detail.receipt?.name)
        assertEquals(128L, detail.receipt?.sizeBytes)
        assertEquals(9L, detail.summary.version)
        assertEquals(setOf(BusinessCapability.VIEW_ORDERS), result.value.capabilities)
        assertEquals("2026-07-20T10:30:00.000Z", result.value.serverTime)
    }

    @Test
    fun optionalDetailFieldsUseSafeDefaultsAndUnknownFieldsAreIgnored() = runTest {
        val minimal = """{
            "order": {
                "id":"RO-2", "companyId":"tongda", "date":"2026-07-20",
                "status":"待结算", "version":2, "updatedAt":"2026-07-20 11:00:00",
                "unknown":{"nested":true}
            },
            "futureField": true
        }""".trimIndent()
        val result = api(RecordingTransport(OrdersHttpResponse(200, minimal)))
            .fetchDetail("token", "RO-2") as OrderReadResult.Success

        assertEquals("", result.value.order.phone)
        assertEquals(0L, result.value.order.laborCents)
        assertEquals(0L, result.value.order.materialCents)
        assertNull(result.value.order.receipt)
        assertFalse(result.value.order.voided)
        assertEquals("", result.value.order.summary.plate)
    }

    @Test
    fun malformedRequiredDetailFieldReturnsMalformedResponse() = runTest {
        val malformed = detailJson.replace("\"version\": 9", "\"version\": \"nine\"")
        val result = api(RecordingTransport(OrdersHttpResponse(200, malformed)))
            .fetchDetail("token", "RO-1")

        assertEquals(
            OrderReadResult.Failure(OrderReadFailure.MalformedResponse),
            result,
        )
    }

    @Test
    fun malformedPageEnvelopeReturnsMalformedResponse() = runTest {
        val result = api(RecordingTransport(OrdersHttpResponse(200, "{not-json")))
            .fetchPage("token", OrderPageQuery(OrderScope.CURRENT))

        assertEquals(
            OrderReadResult.Failure(OrderReadFailure.MalformedResponse),
            result,
        )
    }

    @Test
    fun missingOptionalPageEnvelopeFieldsUseSafeDefaults() = runTest {
        val minimal = """{
            "orders": [{
                "id":"RO-3", "companyId":"tongda", "date":"2026-07-20",
                "status":"在修中", "version":3, "updatedAt":"2026-07-20 12:00:00"
            }]
        }""".trimIndent()
        val result = api(RecordingTransport(OrdersHttpResponse(200, minimal)))
            .fetchPage("token", OrderPageQuery(OrderScope.CURRENT)) as OrderReadResult.Success

        assertEquals(1, result.value.orders.size)
        assertNull(result.value.nextCursor)
        assertEquals(emptyList<String>(), result.value.removedOrderIds)
        assertEquals("", result.value.serverTime)
        assertEquals(emptySet<BusinessCapability>(), result.value.capabilities)
    }

    @Test
    fun httpFailuresMapToPreciseReasons() = runTest {
        for ((status, reason) in listOf(
            401 to OrderReadFailure.Unauthorized,
            403 to OrderReadFailure.Forbidden,
            404 to OrderReadFailure.NotFound,
            503 to OrderReadFailure.ServerError,
        )) {
            val api = api(RecordingTransport(OrdersHttpResponse(status, "{}")))
            assertEquals(
                OrderReadResult.Failure(reason),
                api.fetchPage("token", OrderPageQuery(OrderScope.CURRENT)),
            )
            assertEquals(
                OrderReadResult.Failure(reason),
                api.fetchDetail("token", "RO-1"),
            )
        }
    }

    @Test
    fun ioFailureMapsNetworkUnavailable() = runTest {
        val result = api(RecordingTransport(error = IOException("offline")))
            .fetchPage("token", OrderPageQuery(OrderScope.CURRENT))

        assertEquals(
            OrderReadResult.Failure(OrderReadFailure.NetworkUnavailable),
            result,
        )
    }

    @Test
    fun cancellationPropagatesWithoutBusinessMapping() = runTest {
        val cancellation = CancellationException("cancelled")
        val api = api(RecordingTransport(cancellation = cancellation))

        try {
            api.fetchDetail("token", "RO-1")
            fail("Expected cancellation")
        } catch (caught: CancellationException) {
            assertSame(cancellation, caught)
        }
    }

    @Test
    fun queryRejectsOutOfRangeLimitAndAmbiguousPagination() {
        try {
            OrderPageQuery(OrderScope.CURRENT, limit = 0)
            fail("Expected invalid limit")
        } catch (_: IllegalArgumentException) {
            // Expected.
        }
        try {
            OrderPageQuery(OrderScope.CURRENT, cursor = "cursor", updatedAfter = "time")
            fail("Expected ambiguous pagination")
        } catch (_: IllegalArgumentException) {
            // Expected.
        }
    }

    private fun api(transport: OrdersHttpTransport) = HttpUrlConnectionOrderReadApi(
        apiOrigin = "https://chengxu.pages.dev/",
        transport = transport,
        currentYear = { 2026 },
    )

    private class RecordingTransport(
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
        val pageJson = """{
            "orders": [{
                "id":"RO-1001", "companyId":"tongda", "date":"2026-07-20", "time":"09:30",
                "plate":"蒙K·A3816", "customer":"张先生", "car":"大众帕萨特", "type":"常规保养",
                "status":"在修中", "version":7, "updatedAt":"2026-07-20 10:00:00",
                "amountCents":12345, "amount":1.00, "record":"更换机油与滤芯",
                "insuranceExpiry":"2026-08-01", "delivery":"2026-07-20 18:00"
            }, {
                "id":"missing-version", "companyId":"tongda", "date":"2026-07-20",
                "status":"在修中", "updatedAt":"2026-07-20 10:00:00"
            }],
            "nextCursor":"next-token",
            "removedOrderIds":["RO-OLD", "", "RO-OLD", 7, "RO-VOID"],
            "serverTime":"2026-07-20T10:30:00.000Z",
            "capabilities":["VIEW_ORDERS", "EDIT_ORDER", "FUTURE_CAPABILITY"]
        }""".trimIndent()

        val detailJson = """{
            "order": {
                "id":"RO-1001", "companyId":"tongda", "date":"2026-07-20", "time":"09:30",
                "plate":"蒙K·A3816", "customer":"张先生", "car":"大众帕萨特", "type":"常规保养",
                "status":"待结算", "version": 9, "updatedAt":"2026-07-20 10:00:00",
                "amount":300.50, "record":"维修记录", "insuranceExpiry":"2026-08-01",
                "delivery":"2026-07-20 18:00", "phone":"15000000000", "insurer":"人保财险",
                "staff":"张工", "vin":"VIN-001", "claimNo":"CL-001", "accidentType":"常规维修",
                "paymentMethod":"待确认", "remark":"备注", "laborCents":10050, "labor":1,
                "material":200, "settlementDate":"", "settlementTime":"", "settlementRemark":"",
                "receipt":{"name":"receipt.png", "contentType":"image/png", "sizeBytes":128,
                    "uploadedAt":"2026-07-20 10:00:00"},
                "voided":false, "voidedAt":"", "voidReason":"", "futureField":"ignored"
            },
            "serverTime":"2026-07-20T10:30:00.000Z",
            "capabilities":["VIEW_ORDERS"]
        }""".trimIndent()
    }
}
