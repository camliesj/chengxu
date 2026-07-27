package com.chengxu.autoservice.core.orders

import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test
import java.io.IOException
import kotlinx.coroutines.CancellationException

class HttpUrlConnectionCustomerVehiclesApiTest {
    @Test
    fun fetchSendsBearerAndMapsVehicles() = runTest {
        val transport = FakeTransport(OrdersHttpResponse(200, """{"vehicles":[{"id":"CV-1","companyId":"tongda","customer":"张先生","phone":"13800000000","plate":"蒙A12345","car":"帕萨特","vin":"VIN-1","insurer":"人保","vehicleType":"标的车","source":"手动录入","remark":""}]}"""))

        val result = HttpUrlConnectionCustomerVehiclesApi("https://chengxu.pages.dev/", transport).fetch("token")

        assertEquals("https://chengxu.pages.dev/api/customer-vehicles", transport.url)
        assertEquals("Bearer token", transport.authorization)
        assertTrue(result is CustomerVehiclesResult.Success)
        assertEquals("CV-1", (result as CustomerVehiclesResult.Success).records.single().id)
    }

    @Test
    fun fetchRejectsMalformedMapsFailuresAndPropagatesCancellation() = runTest {
        assertEquals(CustomerVehiclesResult.Failure(OrdersFailure.Unauthorized), api(OrdersHttpResponse(401, "")).fetch("t"))
        assertEquals(CustomerVehiclesResult.Failure(OrdersFailure.MalformedResponse), api(OrdersHttpResponse(200, "{\"vehicles\":[{\"id\":\"x\"}]}" )).fetch("t"))
        assertEquals(CustomerVehiclesResult.Failure(OrdersFailure.NetworkUnavailable), HttpUrlConnectionCustomerVehiclesApi("https://x", FakeTransport(error = IOException())).fetch("t"))
        val cancellation = CancellationException("cancel")
        try {
            HttpUrlConnectionCustomerVehiclesApi("https://x", FakeTransport(cancellation = cancellation)).fetch("t")
            fail("Expected cancellation")
        } catch (caught: CancellationException) {
            assertSame(cancellation, caught)
        }
    }

    private fun api(response: OrdersHttpResponse) = HttpUrlConnectionCustomerVehiclesApi("https://x", FakeTransport(response))

    private class FakeTransport(
        private val response: OrdersHttpResponse? = null,
        private val error: IOException? = null,
        private val cancellation: CancellationException? = null,
    ) : OrdersHttpTransport {
        var url = ""
        var authorization = ""
        override suspend fun get(url: String, authorization: String): OrdersHttpResponse {
            this.url = url
            this.authorization = authorization
            cancellation?.let { throw it }; error?.let { throw it }
            return requireNotNull(response)
        }
    }
}
