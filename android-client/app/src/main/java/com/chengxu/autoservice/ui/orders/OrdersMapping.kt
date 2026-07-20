package com.chengxu.autoservice.ui.orders

import com.chengxu.autoservice.core.orders.RepairOrder
import java.text.DecimalFormat
import java.text.DecimalFormatSymbols
import java.util.Locale

internal fun mapOrder(order: RepairOrder): OrderDisplayModel {
    val id = order.id.trim().ifBlank { "未填写" }
    val plate = order.plate.trim().ifBlank { "未填写" }
    val customer = order.customer.trim().ifBlank { "未填写" }
    val car = order.car.trim()
    val type = order.type.trim()
    val record = order.record.trim()
    val date = order.date.trim().ifBlank { "未填写" }
    val time = order.time.trim().ifBlank { "未填写" }
    val status = order.status.trim().ifBlank { "未知状态" }

    return OrderDisplayModel(
        id = id,
        plate = plate,
        customer = customer,
        car = car.ifBlank { "未填写" },
        type = type.ifBlank { "未填写" },
        status = status,
        statusTone = status.toStatusTone(),
        serviceSummary = record.ifBlank {
            listOf(car, type)
                .filter(String::isNotBlank)
                .joinToString(" · ")
                .ifBlank { "暂无维修说明" }
        },
        record = record.ifBlank { "未填写" },
        date = date,
        time = time,
        dateTimeLabel = when {
            date == "未填写" && time == "未填写" -> "未填写"
            date == "未填写" -> time
            time == "未填写" -> date
            else -> "$date · $time"
        },
        amountLabel = formatOrderMoney(order.amountCents),
        insuranceExpiry = order.insuranceExpiry.trim().ifBlank { "未填写" },
        delivery = order.delivery.trim().ifBlank { "未填写" },
    )
}

internal fun filterOrders(
    rows: List<OrderDisplayModel>,
    query: String,
    filter: OrderStatusFilter,
): List<OrderDisplayModel> {
    val normalizedQuery = query.trim().lowercase(Locale.ROOT)
    return rows.filter { row ->
        val matchesStatus = filter.status == null || row.status == filter.status
        val matchesQuery = normalizedQuery.isEmpty() || listOf(
            row.id,
            row.plate,
            row.customer,
            row.car,
            row.record,
        ).any { value -> value.lowercase(Locale.ROOT).contains(normalizedQuery) }
        matchesStatus && matchesQuery
    }
}

private fun String.toStatusTone(): OrderStatusTone = when (this) {
    "在修中" -> OrderStatusTone.PRIMARY
    "已完工" -> OrderStatusTone.SUCCESS
    "待结算" -> OrderStatusTone.WARNING
    "已结算" -> OrderStatusTone.SUCCESS
    else -> OrderStatusTone.NEUTRAL
}

private fun formatOrderMoney(amountCents: Long): String {
    val safeCents = amountCents.coerceAtLeast(0)
    val formatter = DecimalFormat("#,##0.##", DecimalFormatSymbols(Locale.US)).apply {
        minimumFractionDigits = if (safeCents % 100 == 0L) 0 else 2
        maximumFractionDigits = 2
    }
    return "¥${formatter.format(safeCents.toBigDecimal().movePointLeft(2))}"
}
