package com.chengxu.autoservice.core.orders

import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class HttpUrlConnectionOrderReceiptApiTest {
    @Test fun `upload posts gallery image as receipt multipart data`() = runTest {
        val transport = RecordingTransport(ReceiptHttpResponse(200, receiptJson))
        val result = HttpUrlConnectionOrderReceiptApi("https://chengxu.pages.dev", transport)
            .upload("token", "RO/1", ReceiptUpload("receipt.png", "image/png", byteArrayOf(1, 2, 3)))

        assertEquals("https://chengxu.pages.dev/api/receipts", transport.url)
        assertEquals("Bearer token", transport.authorization)
        assertEquals("RO/1", transport.orderId)
        assertEquals("image/png", transport.upload?.contentType)
        assertEquals(3, transport.upload?.bytes?.size)
        assertEquals("receipts/tongda/2026/RO-1.png", (result as ReceiptOperationResult.Success).value.key)
    }

    @Test fun `download and delete use isolated receipt endpoint and map authorization failure`() = runTest {
        val downloadTransport = RecordingTransport(ReceiptHttpResponse(200, "image", contentType = "image/png", bytes = byteArrayOf(9)))
        val download = HttpUrlConnectionOrderReceiptApi("https://chengxu.pages.dev", downloadTransport)
            .download("token", "receipts/tongda/2026/RO-1.png")
        assertEquals("https://chengxu.pages.dev/api/receipts?key=receipts%2Ftongda%2F2026%2FRO-1.png", downloadTransport.url)
        assertTrue(download is ReceiptOperationResult.Success)

        val deleteTransport = RecordingTransport(ReceiptHttpResponse(401, ""))
        val deleted = HttpUrlConnectionOrderReceiptApi("https://chengxu.pages.dev", deleteTransport)
            .delete("token", "receipts/tongda/2026/RO-1.png", "RO-1")
        assertEquals("RO-1", deleteTransport.orderId)
        assertEquals(ReceiptOperationResult.Unauthorized, deleted)
    }

    private class RecordingTransport(private val response: ReceiptHttpResponse) : OrderReceiptHttpTransport {
        var url = ""
        var authorization = ""
        var orderId = ""
        var upload: ReceiptUpload? = null

        override suspend fun upload(url: String, authorization: String, orderId: String, upload: ReceiptUpload): ReceiptHttpResponse {
            this.url = url; this.authorization = authorization; this.orderId = orderId; this.upload = upload
            return response
        }

        override suspend fun download(url: String, authorization: String): ReceiptHttpResponse {
            this.url = url; this.authorization = authorization
            return response
        }

        override suspend fun delete(url: String, authorization: String, key: String, orderId: String): ReceiptHttpResponse {
            this.url = url; this.authorization = authorization; this.orderId = orderId
            return response
        }
    }

    private companion object {
        const val receiptJson = """{"receipt":{"key":"receipts/tongda/2026/RO-1.png","name":"receipt.png","type":"image/png","size":3,"uploadedAt":"2026-07-28T02:30:00.000Z"}}"""
    }
}
