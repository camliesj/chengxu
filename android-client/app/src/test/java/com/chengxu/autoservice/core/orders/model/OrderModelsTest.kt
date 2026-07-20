package com.chengxu.autoservice.core.orders.model

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class OrderModelsTest {
    @Test
    fun wireStatusMappingTrimsKnownValuesAndRejectsUnknownValues() {
        assertEquals(OrderStatus.IN_REPAIR, OrderStatus.fromWire(" 在修中 "))
        assertEquals(OrderStatus.PENDING_SETTLEMENT, OrderStatus.fromWire("待结算"))
        assertNull(OrderStatus.fromWire(" 未知 "))
    }

    @Test
    fun summaryUsesIntegerCentsAndPageCarriesDeltaRemovals() {
        val summary = summary(amountCents = 50_025L)
        val page = OrderPage(
            orders = listOf(summary),
            nextCursor = "next",
            removedOrderIds = listOf("RO-OLD"),
            serverTime = "2026-07-20T10:00:00Z",
            capabilities = setOf(BusinessCapability.VIEW_ORDERS),
        )

        assertEquals(50_025L, page.orders.single().amountCents)
        assertEquals(listOf("RO-OLD"), page.removedOrderIds)
    }

    @Test
    fun receiptMetadataCannotPersistObjectKeysOrUrls() {
        val propertyNames = ReceiptMetadata::class.java.declaredFields.map { it.name }.toSet()

        assertTrue(propertyNames.containsAll(setOf("name", "contentType", "sizeBytes", "uploadedAt")))
        assertFalse(propertyNames.any { it.contains("key", ignoreCase = true) })
        assertFalse(propertyNames.any { it.contains("url", ignoreCase = true) })
    }

    private fun summary(amountCents: Long) = OrderSummary(
        id = "RO-1001",
        companyId = "tongda",
        version = 1,
        date = "2026-07-20",
        dateSortKey = "2026-07-20",
        time = "09:30",
        plate = "蒙K·A3816",
        customer = "张先生",
        car = "大众帕萨特",
        type = "常规保养",
        status = "在修中",
        amountCents = amountCents,
        record = "更换机油与滤芯",
        insuranceExpiry = "2026-08-01",
        delivery = "2026-07-20 18:00",
        updatedAt = "2026-07-20 09:30:00",
    )
}
