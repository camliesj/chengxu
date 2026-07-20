package com.chengxu.autoservice.ui.workbench

import com.chengxu.autoservice.core.orders.RepairOrder
import org.junit.Assert.assertEquals
import org.junit.Test
import java.time.LocalDate

class WorkbenchMetricsTest {
    private val today = LocalDate.of(2026, 7, 17)

    @Test
    fun employeeMetricsUseTodayStatusAndInclusiveThreeDayInsuranceWindow() {
        val orders = listOf(
            order("today-short", date = "07-17", dateSortKey = "2026-07-17", status = "在修中", expiry = "2026-07-16"),
            order("today-full", date = "2026-07-17", status = "已完工", expiry = "07-20"),
            order("pending", date = "2026-07-16", status = "待结算", expiry = "2026-07-21"),
            order("repair", date = "bad", dateSortKey = "", status = "在修中", expiry = "bad"),
        )

        val metrics = buildEmployeeMetrics(orders, today)

        assertEquals("2", metrics.single { it.label == "今日接车" }.value)
        assertEquals("2", metrics.single { it.label == "在修车辆" }.value)
        assertEquals("1", metrics.single { it.label == "待交付" }.value)
        assertEquals("2", metrics.single { it.label == "保险到期" }.value)
    }

    @Test
    fun administratorMetricsUseRealMonthlyAndPendingValues() {
        val orders = listOf(
            order("a", amountCents = 100_000, status = "已结算"),
            order("b", amountCents = 30_025, status = "待结算"),
            order("c", amountCents = 10_000, status = "待结算"),
            order("old", date = "2026-06-30", dateSortKey = "2026-06-30", amountCents = 99_900),
        )

        val metrics = buildAdministratorMetrics(orders, today)

        assertEquals("¥1,400.25", metrics.single { it.label == "本月产值" }.value)
        val pending = metrics.single { it.label == "待结算金额" }
        assertEquals("¥400.25", pending.value)
        assertEquals("2 单待处理", pending.detail)
    }

    @Test
    fun administratorInsuranceWindowIncludesExpiredAndSevenDaysButNotEight() {
        val orders = listOf(
            order("expired", expiry = "2026-01-01"),
            order("seven", expiry = "2026-07-24"),
            order("eight", expiry = "2026-07-25"),
            order("invalid", expiry = "not-a-date"),
        )

        val metrics = buildAdministratorMetrics(orders, today)

        assertEquals("2", metrics.single { it.label == "保险到期" }.value)
    }

    @Test
    fun invalidDatesAndNegativeAmountsDoNotAffectMonthlyTotals() {
        val orders = listOf(
            order("invalid-date", date = "bad", dateSortKey = "", amountCents = 50_000),
            order("negative", amountCents = -100),
        )

        val metrics = buildAdministratorMetrics(orders, today)

        assertEquals("¥0", metrics.single { it.label == "本月产值" }.value)
    }

    @Test
    fun recentOrdersSortDescendingAndUseRecordThenCarTypeFallback() {
        val orders = listOf(
            order("older", date = "2026-07-16", dateSortKey = "2026-07-16", time = "18:00", record = "原始记录"),
            order("newer", time = "09:00", record = "", car = "大众帕萨特", type = "常规保养"),
            order("empty", time = "08:00", record = "", car = "", type = ""),
        )

        val mapped = mapRecentOrders(orders)

        assertEquals(listOf("newer", "empty", "older"), mapped.map { it.orderNumber })
        assertEquals("大众帕萨特 · 常规保养", mapped[0].repairSummary)
        assertEquals("暂无维修说明", mapped[1].repairSummary)
        assertEquals("原始记录", mapped[2].repairSummary)
    }

    @Test
    fun moneyFormattingUsesTwoDecimalsOnlyWhenCentsAreNonZero() {
        assertEquals("¥500", formatMoney(50_000))
        assertEquals("¥500.25", formatMoney(50_025))
        assertEquals("¥0", formatMoney(-1))
    }

    @Test
    fun unknownStatusRemainsVisibleOnMappedOrder() {
        val mapped = mapRecentOrders(listOf(order("unknown", status = "等待配件"))).single()

        assertEquals("等待配件", mapped.statusLabel)
    }

    private fun order(
        id: String,
        date: String = "2026-07-17",
        dateSortKey: String = date,
        time: String = "09:30",
        status: String = "在修中",
        amountCents: Long = 0,
        record: String = "维修记录",
        car: String = "车型",
        type: String = "维修类型",
        expiry: String = "",
    ) = RepairOrder(
        id = id,
        companyId = "tongda",
        date = date,
        dateSortKey = dateSortKey,
        time = time,
        plate = "蒙A12345",
        customer = "张先生",
        car = car,
        type = type,
        status = status,
        amountCents = amountCents,
        record = record,
        insuranceExpiry = expiry,
        delivery = "",
    )
}
