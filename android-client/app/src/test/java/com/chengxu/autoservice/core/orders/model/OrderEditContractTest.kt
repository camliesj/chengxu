package com.chengxu.autoservice.core.orders.model

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.long
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Test

class OrderEditContractTest {
    private val json = Json { ignoreUnknownKeys = true }

    @Test
    fun editCommandUsesTheCanonicalEditableFieldsAndExpectedVersion() {
        val fixture = checkNotNull(javaClass.classLoader?.getResourceAsStream("order-edit-v1.json"))
            .bufferedReader(Charsets.UTF_8).use { json.parseToJsonElement(it.readText()).jsonObject }
        val input = fixture["validCases"]!!.jsonArray.first().jsonObject["input"]!!.jsonObject
        val fields = fixture["fields"]!!.jsonArray.map { it.jsonPrimitive.content }.toSet()
        val form = OrderCreationForm(
            customer = input.text("customer"), phone = input.text("phone"), plate = input.text("plate"),
            car = input.text("car"), vin = input.text("vin"), staff = input.text("staff"),
            insuranceExpiry = input.text("insuranceExpiry"), insurer = input.text("insurer"),
            type = input.text("type"), accidentType = input.text("accidentType"), claimNo = input.text("claimNo"),
            record = input.text("record"), labor = centsText(input, "laborCents"), material = centsText(input, "materialCents"),
            delivery = input.text("delivery"), remark = input.text("remark"),
        )

        val command = form.toEditCommand("edit-op", 7L) as OrderCommandResult.Success<OrderEditCommand>
        val body = command.value.toJsonObject()

        assertEquals(7L, body["expectedVersion"]?.jsonPrimitive?.long)
        assertEquals(fields, body["order"]?.jsonObject?.keys)
        assertNull(body["order"]?.jsonObject?.get("status"))
        assertFalse(body.containsKey("status"))
    }

    private fun kotlinx.serialization.json.JsonObject.text(key: String): String =
        get(key)?.jsonPrimitive?.content.orEmpty()

    private fun centsText(input: kotlinx.serialization.json.JsonObject, key: String): String {
        val cents = input[key]?.jsonPrimitive?.long ?: 0L
        return if (cents % 100L == 0L) (cents / 100L).toString()
        else "${cents / 100L}.${(cents % 100L).toString().padStart(2, '0')}"
    }
}
