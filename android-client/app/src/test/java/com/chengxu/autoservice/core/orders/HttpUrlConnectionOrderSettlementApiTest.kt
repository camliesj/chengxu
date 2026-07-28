package com.chengxu.autoservice.core.orders

import com.chengxu.autoservice.core.orders.model.OrderCommandResult
import com.chengxu.autoservice.core.orders.model.ReceiptMetadata
import com.chengxu.autoservice.core.orders.model.SettlementCommand
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class HttpUrlConnectionOrderSettlementApiTest {
    @Test fun settlePostsVersionedCommandWithReceiptMetadata() = runTest {
        val transport = RecordingTransport(OrdersHttpResponse(200, detailJson))
        val result = HttpUrlConnectionOrderSettlementApi("https://chengxu.pages.dev", transport, currentYear = { 2026 })
            .settle("token", "RO/1", SettlementCommand("settle-op", 4, "现金", "2026-07-28", "10:30", "到账", receipt()))
        assertEquals("https://chengxu.pages.dev/api/orders/RO%2F1/settlement", transport.url)
        assertTrue(transport.body.contains("\"contentType\":\"image/png\""))
        assertTrue(result is OrderCommandResult.Success<*>)
    }

    @Test fun reverseAndReceiptUpdateUseDedicatedPathsAndMapConflict() = runTest {
        val reverseTransport = RecordingTransport(OrdersHttpResponse(409, conflictJson))
        val reverse = HttpUrlConnectionOrderSettlementApi("https://chengxu.pages.dev", reverseTransport, currentYear = { 2026 })
            .reverse("token", "RO-1", "reverse-op", 5)
        assertEquals("https://chengxu.pages.dev/api/orders/RO-1/reverse-settlement", reverseTransport.url)
        assertTrue(reverse is OrderCommandResult.Conflict)
        val receiptTransport = RecordingTransport(OrdersHttpResponse(409, """{"error":"OPERATION_IN_PROGRESS"}"""))
        val receipt = HttpUrlConnectionOrderSettlementApi("https://chengxu.pages.dev", receiptTransport, currentYear = { 2026 })
            .updateReceipt("token", "RO-1", "receipt-op", 5, null)
        assertEquals("https://chengxu.pages.dev/api/orders/RO-1/receipt", receiptTransport.url)
        assertEquals(OrderCommandResult.UnknownResult("receipt-op"), receipt)
    }

    private fun receipt() = ReceiptMetadata("receipts/tongda/2026/RO-1.png", "receipt.png", "image/png", 128, "2026-07-28T02:30:00.000Z")
    private class RecordingTransport(private val response: OrdersHttpResponse) : OrderStatusHttpTransport {
        var url = ""; var body = ""
        override suspend fun get(url: String, authorization: String): OrdersHttpResponse = response
        override suspend fun post(url: String, authorization: String, body: String): OrdersHttpResponse { this.url = url; this.body = body; return response }
    }
    private companion object {
        const val detailJson = """{"order":{"id":"RO-1","companyId":"tongda","date":"2026-07-28","status":"已结算","version":5,"updatedAt":"now","customer":"Customer"}}"""
        const val conflictJson = """{"error":"ORDER_SETTLEMENT_CONFLICT","order":{"id":"RO-1","companyId":"tongda","date":"2026-07-28","status":"待结算","version":5,"updatedAt":"now","customer":"Customer"}}"""
    }
}
