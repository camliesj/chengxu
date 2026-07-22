package com.chengxu.autoservice.core.orders.model

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.long
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class OrderCreationContractTest {
    private val json = Json { ignoreUnknownKeys = true }

    @Test
    fun canonicalFixtureIsLoadedFromTheRepositoryContractsDirectory() {
        val root = fixture()

        assertEquals(1L, root["version"]?.jsonPrimitive?.long)
        assertEquals(
            listOf("customer", "phone", "plate", "car", "insuranceExpiry", "record"),
            root["metadata"]?.jsonObject?.get("requiredFields")?.jsonArray
                ?.map { it.jsonPrimitive.content },
        )
        assertEquals(
            listOf("标的车", "三者车"),
            root["metadata"]?.jsonObject?.get("options")?.jsonObject
                ?.get("vehicleTypes")?.jsonArray?.map { it.jsonPrimitive.content },
        )
        assertTrue(
            root["metadata"]?.jsonObject?.get("options")?.jsonObject
                ?.get("accidentTypes")?.jsonArray?.map { it.jsonPrimitive.content }
                ?.contains("机电维修保养") == true,
        )
        assertEquals(120_050L, root["validCases"]?.jsonArray?.first()
            ?.jsonObject?.get("input")?.jsonObject?.get("laborCents")?.jsonPrimitive?.long)
    }

    @Test
    fun formConvertsCanonicalDecimalTextToIntegerCentsAndOnlyClientFields() {
        val canonicalCase = fixture()["validCases"]?.jsonArray?.first()?.jsonObject
            ?: error("missing canonical valid case")
        val input = canonicalCase["input"]?.jsonObject ?: error("missing canonical input")
        val expected = canonicalCase["expected"]?.jsonObject ?: error("missing canonical expected")
        val form = OrderCreationForm(
            customer = input.text("customer"),
            phone = input.text("phone"),
            plate = input.text("plate"),
            car = input.text("car"),
            vin = input.text("vin"),
            staff = input.text("staff"),
            insuranceExpiry = input.text("insuranceExpiry"),
            insurer = input.text("insurer"),
            type = input.text("type"),
            accidentType = input.text("accidentType"),
            claimNo = input.text("claimNo"),
            record = input.text("record"),
            labor = centsAsDecimal(input, "laborCents"),
            material = centsAsDecimal(input, "materialCents"),
            delivery = input.text("delivery"),
            remark = input.text("remark"),
        )
        val result = form.toCreateCommand("11111111-1111-4111-8111-111111111111")
            as OrderCommandResult.Success<OrderCreateCommand>

        assertEquals(expected["laborCents"]?.jsonPrimitive?.long, result.value.order.laborCents)
        assertEquals(expected["materialCents"]?.jsonPrimitive?.long, result.value.order.materialCents)
        assertEquals(expected.text("customer"), result.value.order.customer)
        assertEquals(expected.text("remark"), result.value.order.remark)
        val body = result.value.toJsonObject()
        assertEquals("11111111-1111-4111-8111-111111111111", body["operationId"]?.jsonPrimitive?.content)
        val order = body["order"]?.jsonObject ?: error("missing order")
        assertEquals(OrderCreateCommand.CLIENT_FIELDS, order.keys)
        for (systemField in listOf("id", "companyId", "role", "status", "version", "date", "time")) {
            assertFalse(order.containsKey(systemField))
        }
    }

    @Test
    fun everyCanonicalValidFixtureProducesTheExpectedAndroidRequest() {
        for (element in fixture()["validCases"]?.jsonArray.orEmpty()) {
            val canonicalCase = element.jsonObject
            val input = canonicalCase["input"]?.jsonObject ?: error("missing canonical input")
            val expected = canonicalCase["expected"]?.jsonObject ?: error("missing canonical expected")
            val operationId = canonicalCase.text("operationId")
            val result = input.toForm().toCreateCommand(operationId)
                as OrderCommandResult.Success<OrderCreateCommand>
            val body = result.value.toJsonObject()
            val order = body["order"]?.jsonObject ?: error("missing Android request order")
            val expectedOrder = JsonObject(expected.filterKeys(OrderCreateCommand.CLIENT_FIELDS::contains))

            assertEquals(operationId, body["operationId"]?.jsonPrimitive?.content)
            assertEquals(expectedOrder, order)
        }
    }

    @Test
    fun formRejectsNegativeThreeDecimalAndOverflowMoneyWithoutRounding() {
        val negative = fullForm(labor = "-1").toCreateCommand("operation") as OrderCommandResult.ValidationFailure
        assertEquals("order.laborCents.non_negative", negative.fieldErrors["labor"])

        val precision = fullForm(material = "1.005").toCreateCommand("operation") as OrderCommandResult.ValidationFailure
        assertEquals("order.materialCents.max_two_decimals", precision.fieldErrors["material"])

        val overflow = fullForm(labor = "999999999999999").toCreateCommand("operation") as OrderCommandResult.ValidationFailure
        assertEquals("order.laborCents.out_of_range", overflow.fieldErrors["labor"])
    }

    @Test
    fun modelsRetainMetadataFieldErrorsAndOperationState() {
        val metadata = OrderCreationMetadata(
            contractVersion = 1,
            requiredFields = setOf("customer"),
            defaults = OrderCreationDefaults(insurer = "人保财险"),
            options = OrderCreationOptions(insurers = listOf("人保财险")),
            maxLengths = mapOf("customer" to 80),
        )
        val envelope = OrderCreationMetadataEnvelope(
            metadata = metadata,
            capabilities = setOf(BusinessCapability.CREATE_ORDER),
            canCreate = true,
            serverTime = "2026-07-22T00:00:00.000Z",
        )

        assertTrue(envelope.canCreate)
        assertEquals(OrderCreationOperationState.COMPLETED, OrderCreationOperationState.valueOf("COMPLETED"))
        assertEquals(80, envelope.metadata.maxLengths["customer"])
    }

    private fun fixture(): JsonObject {
        val stream = checkNotNull(javaClass.classLoader?.getResourceAsStream("order-creation-v1.json"))
        return stream.bufferedReader(Charsets.UTF_8).use { reader ->
            json.parseToJsonElement(reader.readText()).jsonObject
        }
    }

    private fun fullForm(
        labor: String = "0",
        material: String = "0",
    ) = OrderCreationForm(
        customer = "王先生",
        phone = "15000000000",
        plate = "蒙K12345",
        car = "小鹏 P7+",
        vin = "LXP00000000000001",
        staff = "张工",
        insuranceExpiry = "2027-07-21",
        insurer = "人保财险",
        type = "标的车",
        accidentType = "钣喷维修（有换件）",
        claimNo = "BA20260721001",
        record = "前保险杠修复并喷漆",
        labor = labor,
        material = material,
        delivery = "明日交车",
        remark = "交车前联系客户",
    )

    private fun JsonObject.toForm() = OrderCreationForm(
        customer = text("customer"),
        phone = text("phone"),
        plate = text("plate"),
        car = text("car"),
        vin = text("vin"),
        staff = text("staff"),
        insuranceExpiry = text("insuranceExpiry"),
        insurer = text("insurer"),
        type = text("type"),
        accidentType = text("accidentType"),
        claimNo = text("claimNo"),
        record = text("record"),
        labor = centsAsDecimal(this, "laborCents"),
        material = centsAsDecimal(this, "materialCents"),
        delivery = text("delivery"),
        remark = text("remark"),
    )

    private fun JsonObject.text(key: String): String = get(key)?.jsonPrimitive?.content.orEmpty()

    private fun centsAsDecimal(input: JsonObject, key: String): String {
        val cents = input[key]?.jsonPrimitive?.long ?: 0L
        return if (cents % 100L == 0L) (cents / 100L).toString()
        else "${cents / 100L}.${(cents % 100L).toString().padStart(2, '0')}"
    }
}
