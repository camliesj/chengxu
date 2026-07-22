package com.chengxu.autoservice.core.orders

import com.chengxu.autoservice.core.orders.model.BusinessCapability
import com.chengxu.autoservice.core.orders.model.OrderCommandResult
import com.chengxu.autoservice.core.orders.model.OrderCreateCommand
import com.chengxu.autoservice.core.orders.model.OrderCreationForm
import com.chengxu.autoservice.core.orders.model.OrderCreationMetadataEnvelope
import com.chengxu.autoservice.core.orders.model.OrderDetail
import com.chengxu.autoservice.core.orders.model.toCreateCommand
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test
import java.io.IOException

class HttpUrlConnectionOrderCreateApiTest {
    @Test
    fun metadataUsesBearerAndMapsCompanyOptionsCapabilitiesAndDefaults() = runTest {
        val transport = RecordingCreateTransport(getResponse = OrdersHttpResponse(200, metadataJson))
        val result = api(transport).fetchMetadata("session-token")
            as OrderCommandResult.Success<OrderCreationMetadataEnvelope>

        assertEquals("https://chengxu.pages.dev/api/order-creation-metadata", transport.url)
        assertEquals("Bearer session-token", transport.authorization)
        assertEquals("人保财险", result.value.metadata.defaults.insurer)
        assertEquals(listOf("张工"), result.value.metadata.options.staff.map { it.name })
        assertEquals(setOf(BusinessCapability.VIEW_ORDERS, BusinessCapability.CREATE_ORDER), result.value.capabilities)
        assertTrue(result.value.canCreate)
    }

    @Test
    fun createPostsCanonicalBodyAndAcceptsOnlyServerOrderDetail() = runTest {
        val transport = RecordingCreateTransport(postResponse = OrdersHttpResponse(201, createdJson))
        val command = command()
        val result = api(transport).create("token", command) as OrderCommandResult.Success<OrderDetail>

        assertEquals("https://chengxu.pages.dev/api/orders/create", transport.url)
        assertEquals("Bearer token", transport.authorization)
        assertTrue(transport.body.contains("\"operationId\":\"11111111-1111-4111-8111-111111111111\""))
        assertTrue(!transport.body.contains("\"status\""))
        assertEquals("RO20260700001", result.value.summary.id)
        assertEquals(208_050L, result.value.summary.amountCents)
        assertEquals(120_050L, result.value.laborCents)
    }

    @Test
    fun validationPendingAndCompletedOperationMapPrecisely() = runTest {
        val validation = api(RecordingCreateTransport(postResponse = OrdersHttpResponse(
            400,
            """{"error":"VALIDATION_FAILED","fieldErrors":{"plate":"order.plate.required"}}""",
        ))).create("token", command())
        assertEquals(
            OrderCommandResult.ValidationFailure(mapOf("plate" to "order.plate.required")),
            validation,
        )

        val pending = api(RecordingCreateTransport(postResponse = OrdersHttpResponse(
            409,
            """{"error":"OPERATION_IN_PROGRESS"}""",
        ))).create("token", command())
        assertEquals(OrderCommandResult.UnknownResult(command().operationId), pending)

        val queryPending = api(RecordingCreateTransport(getResponse = OrdersHttpResponse(
            200,
            """{"state":"pending"}""",
        ))).queryOperation("token", "operation/蒙 A")
        assertEquals(OrderCommandResult.UnknownResult("operation/蒙 A"), queryPending)

        val queryComplete = api(RecordingCreateTransport(getResponse = OrdersHttpResponse(200, completedJson)))
            .queryOperation("token", "operation/蒙 A") as OrderCommandResult.Success<OrderDetail>
        assertEquals("RO20260700001", queryComplete.value.summary.id)
    }

    @Test
    fun operationQueryEncodesOnePathSegment() = runTest {
        val transport = RecordingCreateTransport(getResponse = OrdersHttpResponse(200, completedJson))
        api(transport).queryOperation("token", "operation/蒙 A")

        assertEquals(
            "https://chengxu.pages.dev/api/order-operations/create-order/operation%2F%E8%92%99%20A",
            transport.url,
        )
    }

    @Test
    fun httpIoMalformedAndCancellationHaveStableResults() = runTest {
        for ((status, expected) in listOf(
            401 to OrderCommandResult.Unauthorized,
            403 to OrderCommandResult.Forbidden,
            503 to OrderCommandResult.ServerFailure,
        )) {
            assertEquals(
                expected,
                api(RecordingCreateTransport(postResponse = OrdersHttpResponse(status, "{}")))
                    .create("token", command()),
            )
        }
        assertEquals(
            OrderCommandResult.NetworkUnavailable,
            api(RecordingCreateTransport(error = IOException("offline"))).fetchMetadata("token"),
        )
        assertEquals(
            OrderCommandResult.MalformedResponse,
            api(RecordingCreateTransport(getResponse = OrdersHttpResponse(200, "{bad")))
                .fetchMetadata("token"),
        )

        val cancellation = CancellationException("cancelled")
        try {
            api(RecordingCreateTransport(cancellation = cancellation)).create("token", command())
            fail("Expected cancellation")
        } catch (caught: CancellationException) {
            assertSame(cancellation, caught)
        }
    }

    private fun api(transport: OrderCreateHttpTransport) = HttpUrlConnectionOrderCreateApi(
        apiOrigin = "https://chengxu.pages.dev/",
        transport = transport,
        currentYear = { 2026 },
    )

    private fun command(): OrderCreateCommand {
        val result = OrderCreationForm(
            customer = "王先生", phone = "15000000000", plate = "蒙K12345", car = "小鹏 P7+",
            vin = "VIN001", staff = "张工", insuranceExpiry = "2027-07-21", insurer = "人保财险",
            type = "标的车", accidentType = "钣喷维修（有换件）", claimNo = "BA001",
            record = "前保险杠修复", labor = "1200.50", material = "880", delivery = "明日交车",
            remark = "交车前联系",
        ).toCreateCommand("11111111-1111-4111-8111-111111111111")
            as OrderCommandResult.Success<OrderCreateCommand>
        return result.value
    }

    private class RecordingCreateTransport(
        private val getResponse: OrdersHttpResponse? = null,
        private val postResponse: OrdersHttpResponse? = null,
        private val error: IOException? = null,
        private val cancellation: CancellationException? = null,
    ) : OrderCreateHttpTransport {
        var url = ""
        var authorization = ""
        var body = ""

        override suspend fun get(url: String, authorization: String): OrdersHttpResponse {
            record(url, authorization)
            return requireNotNull(getResponse)
        }

        override suspend fun post(url: String, authorization: String, body: String): OrdersHttpResponse {
            record(url, authorization)
            this.body = body
            return requireNotNull(postResponse)
        }

        private fun record(url: String, authorization: String) {
            this.url = url
            this.authorization = authorization
            cancellation?.let { throw it }
            error?.let { throw it }
        }
    }

    private companion object {
        val metadataJson = """{
          "metadata": {
            "contractVersion": 1,
            "requiredFields": ["customer","phone","plate","car","insuranceExpiry","record"],
            "defaults": {"insurer":"人保财险","staff":"张工","type":"标的车","accidentType":"喷漆维修（无换件）","delivery":"待确认","laborCents":0,"materialCents":0,"remark":""},
            "options": {"insurers":["人保财险"],"staff":[{"id":"staff-1","name":"张工","title":"服务顾问"}],"vehicleTypes":["标的车","三者车"],"accidentTypes":["喷漆维修（无换件）"],"deliverySuggestions":["待确认"]},
            "maxLengths": {"customer":80,"record":2000}
          },
          "capabilities": ["VIEW_ORDERS","CREATE_ORDER","FUTURE"],
          "canCreate": true,
          "serverTime": "2026-07-22T00:00:00.000Z"
        }""".trimIndent()

        val createdJson = """{
          "order": {
            "id":"RO20260700001","companyId":"tongda","version":1,"date":"2026-07-22","time":"09:30",
            "plate":"蒙K12345","customer":"王先生","phone":"15000000000","car":"小鹏 P7+","insurer":"人保财险",
            "insuranceExpiry":"2027-07-21","type":"标的车","status":"在修中","laborCents":120050,
            "materialCents":88000,"amountCents":208050,"record":"前保险杠修复","staff":"张工","delivery":"明日交车",
            "vin":"VIN001","claimNo":"BA001","accidentType":"钣喷维修（有换件）","paymentMethod":"待确认",
            "remark":"交车前联系","settlementDate":"","settlementTime":"","settlementRemark":"","receipt":null,
            "voided":false,"voidedAt":"","voidReason":"","updatedAt":"2026-07-22 09:30:00"
          }
        }""".trimIndent()

        val completedJson = createdJson.replaceFirst("\"order\":", "\"state\":\"completed\",\"order\":")
    }
}
