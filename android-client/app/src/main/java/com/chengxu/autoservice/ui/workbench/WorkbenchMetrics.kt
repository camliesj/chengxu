package com.chengxu.autoservice.ui.workbench

import com.chengxu.autoservice.core.designsystem.MetricTone
import com.chengxu.autoservice.core.orders.RepairOrder
import com.chengxu.autoservice.core.orders.normalizedDateSortKey
import java.text.DecimalFormat
import java.text.DecimalFormatSymbols
import java.time.LocalDate
import java.time.YearMonth
import java.time.format.DateTimeParseException
import java.util.Locale

internal fun buildEmployeeMetrics(
    orders: List<RepairOrder>,
    today: LocalDate,
): List<WorkbenchMetric> = listOf(
    WorkbenchMetric("今日接车", orders.count { it.serviceDate() == today }.toString(), "今日新接工单", MetricTone.PRIMARY),
    WorkbenchMetric("在修车辆", orders.countStatus("在修中").toString(), "维修处理中", MetricTone.SUCCESS),
    WorkbenchMetric("待交付", orders.countStatus("已完工").toString(), "等待交付", MetricTone.WARNING),
    WorkbenchMetric("保险到期", orders.countUrgentInsurance(today, 3).toString(), "三日内或已逾期", MetricTone.DANGER),
)

internal fun buildAdministratorMetrics(
    orders: List<RepairOrder>,
    today: LocalDate,
): List<WorkbenchMetric> {
    val month = YearMonth.from(today)
    val monthlyCents = orders
        .filter { it.serviceDate()?.let(YearMonth::from) == month }
        .sumOf { it.amountCents.coerceAtLeast(0) }
    val pending = orders.filter { it.status.trim() == "待结算" }
    val pendingCents = pending.sumOf { it.amountCents.coerceAtLeast(0) }
    return listOf(
        WorkbenchMetric("本月产值", formatMoney(monthlyCents), "本月工单合计", MetricTone.PRIMARY),
        WorkbenchMetric("待结算金额", formatMoney(pendingCents), "${pending.size} 单待处理", MetricTone.WARNING),
        WorkbenchMetric("在修车辆", orders.countStatus("在修中").toString(), "维修处理中", MetricTone.SUCCESS),
        WorkbenchMetric("保险到期", orders.countUrgentInsurance(today, 7).toString(), "七日内或已逾期", MetricTone.DANGER),
    )
}

internal fun buildStatusMetrics(
    orders: List<RepairOrder>,
    today: LocalDate,
    insuranceWindowDays: Long,
): List<WorkbenchMetric> = listOf(
    WorkbenchMetric("今日", orders.count { it.serviceDate() == today }.toString(), "今日接车", MetricTone.PRIMARY),
    WorkbenchMetric("在修", orders.countStatus("在修中").toString(), "维修看板", MetricTone.SUCCESS),
    WorkbenchMetric("待结算", orders.countStatus("待结算").toString(), "费用核对", MetricTone.WARNING),
    WorkbenchMetric("保险到期", orders.countUrgentInsurance(today, insuranceWindowDays).toString(), "联系车主", MetricTone.DANGER),
)

internal fun mapRecentOrders(orders: List<RepairOrder>): List<WorkbenchOrder> = orders
    .sortedWith(
        compareByDescending<RepairOrder> { it.dateSortKey }
            .thenByDescending { it.time }
            .thenByDescending { it.id },
    )
    .map { order ->
        WorkbenchOrder(
            orderNumber = order.id,
            plateNumber = order.plate,
            customerName = order.customer,
            statusLabel = order.status.ifBlank { "未知状态" },
            repairSummary = order.record.ifBlank {
                listOf(order.car, order.type)
                    .filter(String::isNotBlank)
                    .joinToString(" · ")
                    .ifBlank { "暂无维修说明" }
            },
            amountLabel = formatMoney(order.amountCents),
        )
    }

internal fun formatMoney(amountCents: Long): String {
    val safeCents = amountCents.coerceAtLeast(0)
    val formatter = DecimalFormat("#,##0.##", DecimalFormatSymbols(Locale.US)).apply {
        minimumFractionDigits = if (safeCents % 100 == 0L) 0 else 2
        maximumFractionDigits = 2
    }
    return "¥${formatter.format(safeCents.toBigDecimal().movePointLeft(2))}"
}

private fun List<RepairOrder>.countStatus(status: String): Int = count { it.status.trim() == status }

private fun List<RepairOrder>.countUrgentInsurance(today: LocalDate, windowDays: Long): Int {
    val inclusiveEnd = today.plusDays(windowDays)
    return count { order ->
        order.insuranceDate(today)?.let { !it.isAfter(inclusiveEnd) } == true
    }
}

private fun RepairOrder.serviceDate(): LocalDate? = dateSortKey.toLocalDateOrNull()

private fun RepairOrder.insuranceDate(today: LocalDate): LocalDate? =
    normalizedDateSortKey(insuranceExpiry, today.year).toLocalDateOrNull()

private fun String.toLocalDateOrNull(): LocalDate? = try {
    takeIf(String::isNotBlank)?.let(LocalDate::parse)
} catch (_: DateTimeParseException) {
    null
}
