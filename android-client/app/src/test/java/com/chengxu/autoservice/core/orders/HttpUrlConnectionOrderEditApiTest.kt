package com.chengxu.autoservice.core.orders

import com.chengxu.autoservice.core.orders.model.OrderCommandResult
import com.chengxu.autoservice.core.orders.model.OrderCreateInput
import com.chengxu.autoservice.core.orders.model.OrderEditCommand
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test
import java.io.IOException

class HttpUrlConnectionOrderEditApiTest {
    @Test
    fun editUsesPatchEncodedPathBearerAndExactBody() = runTest {
        val transport = RecordingTransport(OrdersHttpResponse(200, detailJson))
        val result = api(transport).edit("session", "RO/蒙 A", command())

        assertEquals("https://chengxu.pages.dev/api/orders/RO%2F%E8%92%99%20A", transport.url)
        assertEquals("Bearer session", transport.authorization)
        assertEquals("PATCH", transport.method)
        assertEquals("edit-op", transport.body.substringAfter("\"operationId\":\"").substringBefore('"'))
        assertTrue(result is OrderCommandResult.Success<*>)
    }

    @Test
    fun editMapsValidationAuthorizationNotFoundAndConflictResponses() = runTest {
        val cases = listOf(
            OrdersHttpResponse(400, """{"error":"VALIDATION_FAILED","fieldErrors":{"record":"required"}}""") to
                OrderCommandResult.ValidationFailure(mapOf("record" to "required")),
            OrdersHttpResponse(401, "{}") to OrderCommandResult.Unauthorized,
            OrdersHttpResponse(403, "{}") to OrderCommandResult.Forbidden,
            OrdersHttpResponse(404, "{}") to OrderCommandResult.NotFound,
        )
        for ((response, expected) in cases) {
            assertEquals(expected, api(RecordingTransport(response)).edit("token", "RO-1", command()))
        }
        val conflict = api(RecordingTransport(OrdersHttpResponse(409, conflictJson))).edit("token", "RO-1", command())
            as OrderCommandResult.Conflict
        assertEquals(setOf("record", "laborCents"), conflict.conflictingFields)
        assertEquals(5L, conflict.latest?.summary?.version)
    }

    @Test
    fun emittedFailuresAndPendingOperationMapToUnknownResult() = runTest {
        assertEquals(
            OrderCommandResult.UnknownResult("edit-op"),
            api(RecordingTransport(OrdersHttpResponse(409, """{"error":"OPERATION_IN_PROGRESS"}""")))
                .edit("token", "RO-1", command()),
        )
        assertEquals(
            OrderCommandResult.UnknownResult("edit-op"),
            api(RecordingTransport(OrdersHttpResponse(503, "{}"))).edit("token", "RO-1", command()),
        )
        assertEquals(
            OrderCommandResult.UnknownResult("edit-op"),
            api(RecordingTransport(error = IOException("offline"))).edit("token", "RO-1", command()),
        )
        assertEquals(
            OrderCommandResult.UnknownResult("edit-op"),
            api(RecordingTransport(OrdersHttpResponse(200, "not json"))).edit("token", "RO-1", command()),
        )
    }

    @Test
    fun editRejectsMissingExpectedVersionBeforeEmittingARequest() = runTest {
        val transport = RecordingTransport(OrdersHttpResponse(200, detailJson))
        val invalid = command().copy(expectedVersion = 0)

        assertEquals(
            OrderCommandResult.ValidationFailure(mapOf("expectedVersion" to "expectedVersion.required")),
            api(transport).edit("token", "RO-1", invalid),
        )
        assertEquals("", transport.method)
    }

    @Test
    fun queryUsesEncodedOperationPathAndMapsCompletedPendingAndReuse() = runTest {
        val transport = RecordingTransport(OrdersHttpResponse(200, """{"state":"completed",${detailJson.drop(1)}"""))
        val completed = api(transport).queryOperation("token", "op/蒙 A")
        assertEquals("https://chengxu.pages.dev/api/order-operations/edit-order/op%2F%E8%92%99%20A", transport.url)
        assertTrue(completed is OrderCommandResult.Success<*>)
        assertEquals(
            OrderCommandResult.UnknownResult("edit-op"),
            api(RecordingTransport(OrdersHttpResponse(200, """{"state":"pending"}"""))).queryOperation("token", "edit-op"),
        )
        assertEquals(
            OrderCommandResult.OperationIdReused,
            api(RecordingTransport(OrdersHttpResponse(409, """{"error":"OPERATION_ID_REUSED"}"""))).queryOperation("token", "edit-op"),
        )
    }

    @Test
    fun cancellationPropagates() = runTest {
        val cancellation = CancellationException("cancelled")
        try {
            api(RecordingTransport(cancellation = cancellation)).edit("token", "RO-1", command())
            fail("Expected cancellation")
        } catch (caught: CancellationException) {
            assertSame(cancellation, caught)
        }
    }

    private fun api(transport: OrderEditHttpTransport) = HttpUrlConnectionOrderEditApi(
        apiOrigin = "https://chengxu.pages.dev/", transport = transport, currentYear = { 2026 },
    )

    private fun command() = OrderEditCommand(
        operationId = "edit-op", expectedVersion = 4,
        order = OrderCreateInput("张先生", "13800000000", "蒙A12345", "示例车型", "VIN", "王师傅", "2027-07-22", "人保", "标的车", "喷漆", "CL", "记录", 30000, 12000, "明日交车", "备注"),
    )

    private class RecordingTransport(
        private val response: OrdersHttpResponse? = null,
        private val error: IOException? = null,
        private val cancellation: CancellationException? = null,
    ) : OrderEditHttpTransport {
        var url = ""
        var authorization = ""
        var method = ""
        var body = ""
        override suspend fun get(url: String, authorization: String): OrdersHttpResponse = respond(url, authorization, "GET", "")
        override suspend fun patch(url: String, authorization: String, body: String): OrdersHttpResponse = respond(url, authorization, "PATCH", body)
        private fun respond(url: String, authorization: String, method: String, body: String): OrdersHttpResponse {
            this.url = url; this.authorization = authorization; this.method = method; this.body = body
            cancellation?.let { throw it }; error?.let { throw it }; return requireNotNull(response)
        }
    }

    private companion object {
        val detailJson = """{"order":{"id":"RO-1","companyId":"tongda","date":"2026-07-20","status":"在修中","version":5,"updatedAt":"2026-07-20 10:00:00","customer":"张先生"}}"""
        val conflictJson = """{"error":"ORDER_VERSION_CONFLICT","order":{"id":"RO-1","companyId":"tongda","date":"2026-07-20","status":"在修中","version":5,"updatedAt":"2026-07-20 10:00:00"},"conflictingFields":["record","laborCents"]}"""
    }
}
