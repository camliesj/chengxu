package com.chengxu.autoservice.ui.orders

import com.chengxu.autoservice.core.orders.RepairOrder
import org.junit.Assert.assertEquals
import org.junit.Test

class OrdersMappingTest {
    @Test
    fun mapOrderUsesSafeFallbacksAndPreservesUnknownStatus() {
        val item = mapOrder(
            order(
                status = "厂家待件",
                record = "",
                car = "帕萨特",
                type = "事故维修",
                delivery = "",
                insuranceExpiry = "  ",
            ),
        )

        assertEquals("厂家待件", item.status)
        assertEquals(OrderStatusTone.NEUTRAL, item.statusTone)
        assertEquals("帕萨特 · 事故维修", item.serviceSummary)
        assertEquals("未填写", item.record)
        assertEquals("¥1,234.56", item.amountLabel)
        assertEquals("未填写", item.delivery)
        assertEquals("未填写", item.insuranceExpiry)
    }

    @Test
    fun mapOrderTrimsFieldsAndUsesRecordAsSummary() {
        val item = mapOrder(
            order(
                id = " RO-9 ",
                plate = " 蒙A99999 ",
                customer = " 张先生 ",
                record = " 更换机油 ",
                status = " 待结算 ",
            ),
        )

        assertEquals("RO-9", item.id)
        assertEquals("蒙A99999", item.plate)
        assertEquals("张先生", item.customer)
        assertEquals("更换机油", item.record)
        assertEquals("更换机油", item.serviceSummary)
        assertEquals(OrderStatusTone.WARNING, item.statusTone)
    }

    @Test
    fun searchAndStatusFilterIntersectWithoutChangingOrder() {
        val rows = listOf(
            mapOrder(order(id = "RO-3", plate = "蒙A33333", customer = "王女士", status = "待结算")),
            mapOrder(order(id = "RO-2", plate = "蒙A22222", customer = "张先生", status = "在修中")),
            mapOrder(order(id = "RO-1", plate = "蒙A11111", customer = "张先生", status = "待结算")),
        )

        val result = filterOrders(
            rows,
            query = " 张先生 ",
            filter = OrderStatusFilter.PENDING_SETTLEMENT,
        )

        assertEquals(listOf("RO-1"), result.map { it.id })
    }

    @Test
    fun searchMatchesEveryApprovedFieldAndLatinIsCaseInsensitive() {
        val rows = listOf(
            mapOrder(order(id = "RO-ALPHA", plate = "蒙A12345", customer = "李女士", car = "Model Y", record = "更换滤芯")),
            mapOrder(order(id = "RO-BETA", plate = "蒙B67890", customer = "王先生", car = "迈腾", record = "Brake PAD")),
        )

        assertEquals(listOf("RO-ALPHA"), filterOrders(rows, "ro-alpha", OrderStatusFilter.ALL).map { it.id })
        assertEquals(listOf("RO-ALPHA"), filterOrders(rows, "A12345", OrderStatusFilter.ALL).map { it.id })
        assertEquals(listOf("RO-ALPHA"), filterOrders(rows, "李女士", OrderStatusFilter.ALL).map { it.id })
        assertEquals(listOf("RO-ALPHA"), filterOrders(rows, "model y", OrderStatusFilter.ALL).map { it.id })
        assertEquals(listOf("RO-BETA"), filterOrders(rows, "brake pad", OrderStatusFilter.ALL).map { it.id })
    }

    @Test
    fun fixedFiltersMatchExactTrimmedStatusesAndAllKeepsUnknowns() {
        val rows = listOf(
            mapOrder(order(id = "repairing", status = " 在修中 ")),
            mapOrder(order(id = "completed", status = "已完工")),
            mapOrder(order(id = "pending", status = "待结算")),
            mapOrder(order(id = "settled", status = "已结算")),
            mapOrder(order(id = "unknown", status = "厂家待件")),
        )

        assertEquals(rows.map { it.id }, filterOrders(rows, " ", OrderStatusFilter.ALL).map { it.id })
        assertEquals(listOf("repairing"), filterOrders(rows, "", OrderStatusFilter.REPAIRING).map { it.id })
        assertEquals(listOf("completed"), filterOrders(rows, "", OrderStatusFilter.COMPLETED).map { it.id })
        assertEquals(listOf("pending"), filterOrders(rows, "", OrderStatusFilter.PENDING_SETTLEMENT).map { it.id })
        assertEquals(listOf("settled"), filterOrders(rows, "", OrderStatusFilter.SETTLED).map { it.id })
    }

    private fun order(
        id: String = "RO-1",
        plate: String = "蒙A12345",
        customer: String = "张先生",
        car: String = "大众帕萨特",
        type: String = "常规保养",
        status: String = "在修中",
        amountCents: Long = 123_456,
        record: String = "维修记录",
        insuranceExpiry: String = "2026-12-31",
        delivery: String = "2026-07-21",
    ) = RepairOrder(
        id = id,
        companyId = "tongda",
        date = "2026-07-20",
        dateSortKey = "2026-07-20",
        time = "09:30",
        plate = plate,
        customer = customer,
        car = car,
        type = type,
        status = status,
        amountCents = amountCents,
        record = record,
        insuranceExpiry = insuranceExpiry,
        delivery = delivery,
    )
}
