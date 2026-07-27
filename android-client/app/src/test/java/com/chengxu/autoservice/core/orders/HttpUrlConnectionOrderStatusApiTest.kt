package com.chengxu.autoservice.core.orders

import com.chengxu.autoservice.core.orders.model.OrderCommandResult
import com.chengxu.autoservice.core.orders.model.OrderStatus
import com.chengxu.autoservice.core.orders.model.OrderStatusCommand
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test
import java.io.IOException

class HttpUrlConnectionOrderStatusApiTest {
    @Test
    fun changePostsCanonicalCommandWithBearerAndEncodedPath() = runTest {
        val transport = RecordingTransport(OrdersHttpResponse(200, detailJson))
        val result = api(transport).change("session", "RO/蒙 A", command())

        assertEquals("https://chengxu.pages.dev/api/orders/RO%2F%E8%92%99%20A/status", transport.url)
        assertEquals("Bearer session", transport.authorization)
        assertEquals("POST", transport.method)
        assertEquals("status-op", transport.body.substringAfter("\"operationId\":\"").substringBefore('"'))
        assertTrue(transport.body.contains("\"expectedVersion\":4"))
        assertTrue(transport.body.contains("\"targetStatus\":\"已完工\""))
        assertTrue(result is OrderCommandResult.Success<*>)
    }

    @Test
    fun changeMapsExplicitResultsAndKeepsEmittedUnknownResult() = runTest {
        val cases = listOf(
            OrdersHttpResponse(400, "{}") to OrderCommandResult.ValidationFailure(mapOf("command" to "invalid")),
            OrdersHttpResponse(401, "{}") to OrderCommandResult.Unauthorized,
            OrdersHttpResponse(403, "{}") to OrderCommandResult.Forbidden,
            OrdersHttpResponse(404, "{}") to OrderCommandResult.NotFound,
            OrdersHttpResponse(409, """{"error":"OPERATION_ID_REUSED"}""") to OrderCommandResult.OperationIdReused,
            OrdersHttpResponse(409, """{"error":"OPERATION_IN_PROGRESS"}""") to OrderCommandResult.UnknownResult("status-op"),
            OrdersHttpResponse(503, "{}") to OrderCommandResult.UnknownResult("status-op"),
        )
        for ((response, expected) in cases) {
            assertEquals(expected, api(RecordingTransport(response)).change("token", "RO-1", command()))
        }
        val conflict = api(RecordingTransport(OrdersHttpResponse(409, conflictJson)))
            .change("token", "RO-1", command()) as OrderCommandResult.Conflict
        assertEquals(5L, conflict.latest?.summary?.version)
    }

    @Test
    fun queryUsesOriginalEncodedOperationIdAndMapsCompletedOrPending() = runTest {
        val transport = RecordingTransport(OrdersHttpResponse(200, """{"state":"completed",${detailJson.drop(1)}"""))
        val completed = api(transport).queryOperation("token", "status/op 蒙")
        assertEquals("https://chengxu.pages.dev/api/order-operations/change-order-status/status%2Fop%20%E8%92%99", transport.url)
        assertTrue(completed is OrderCommandResult.Success<*>)
        assertEquals(
            OrderCommandResult.UnknownResult("status-op"),
            api(RecordingTransport(OrdersHttpResponse(200, """{"state":"pending"}"""))).queryOperation("token", "status-op"),
        )
    }

    @Test
    fun cancellationPropagatesWhileIoFailureBecomesUnknownResult() = runTest {
        assertEquals(
            OrderCommandResult.UnknownResult("status-op"),
            api(RecordingTransport(error = IOException("offline"))).change("token", "RO-1", command()),
        )
        val cancellation = CancellationException("cancelled")
        try {
            api(RecordingTransport(cancellation = cancellation)).change("token", "RO-1", command())
            fail("Expected cancellation")
        } catch (caught: CancellationException) {
            assertSame(cancellation, caught)
        }
    }

    private fun api(transport: OrderStatusHttpTransport) = HttpUrlConnectionOrderStatusApi(
        apiOrigin = "https://chengxu.pages.dev/", transport = transport, currentYear = { 2026 },
    )

    private fun command() = OrderStatusCommand("status-op", 4, OrderStatus.COMPLETED)

    private class RecordingTransport(
        private val response: OrdersHttpResponse? = null,
        private val error: IOException? = null,
        private val cancellation: CancellationException? = null,
    ) : OrderStatusHttpTransport {
        var url = ""
        var authorization = ""
        var method = ""
        var body = ""
        override suspend fun get(url: String, authorization: String): OrdersHttpResponse = respond(url, authorization, "GET", "")
        override suspend fun post(url: String, authorization: String, body: String): OrdersHttpResponse = respond(url, authorization, "POST", body)
        private fun respond(url: String, authorization: String, method: String, body: String): OrdersHttpResponse {
            this.url = url; this.authorization = authorization; this.method = method; this.body = body
            cancellation?.let { throw it }; error?.let { throw it }; return requireNotNull(response)
        }
    }

    private companion object {
        const val detailJson = """{"order":{"id":"RO-1","companyId":"tongda","date":"2026-07-20","status":"已完工","version":5,"updatedAt":"2026-07-20 10:00:00","customer":"张先生"}}"""
        const val conflictJson = """{"error":"ORDER_STATUS_CONFLICT","order":{"id":"RO-1","companyId":"tongda","date":"2026-07-20","status":"待结算","version":5,"updatedAt":"2026-07-20 10:00:00"}}"""
    }
}
