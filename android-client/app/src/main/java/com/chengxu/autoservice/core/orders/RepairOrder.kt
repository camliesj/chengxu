package com.chengxu.autoservice.core.orders

import java.math.BigDecimal
import java.math.RoundingMode
import java.time.DateTimeException
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.format.ResolverStyle

data class RepairOrder(
    val id: String,
    val companyId: String,
    val date: String,
    val dateSortKey: String,
    val time: String,
    val plate: String,
    val customer: String,
    val car: String,
    val type: String,
    val status: String,
    val amountCents: Long,
    val record: String,
    val insuranceExpiry: String,
    val delivery: String,
)

internal fun normalizedDateSortKey(value: String, currentYear: Int): String {
    val text = value.trim()
    if (text.isEmpty()) return ""

    return try {
        when {
            FULL_DATE.matches(text) -> LocalDate.parse(text, STRICT_DATE).toString()
            SHORT_DATE.matches(text) -> {
                val (month, day) = text.split('-').map(String::toInt)
                LocalDate.of(currentYear, month, day).toString()
            }
            else -> ""
        }
    } catch (_: DateTimeException) {
        ""
    } catch (_: NumberFormatException) {
        ""
    }
}

internal fun amountToCents(value: String): Long {
    val amount = value.trim().takeIf(String::isNotEmpty)?.toBigDecimalOrNull() ?: return 0L
    if (amount.signum() < 0) return 0L
    return try {
        amount
            .setScale(2, RoundingMode.HALF_UP)
            .movePointRight(2)
            .longValueExact()
    } catch (_: ArithmeticException) {
        0L
    }
}

private val FULL_DATE = Regex("\\d{4}-\\d{2}-\\d{2}")
private val SHORT_DATE = Regex("\\d{2}-\\d{2}")
private val STRICT_DATE: DateTimeFormatter = DateTimeFormatter.ISO_LOCAL_DATE
    .withResolverStyle(ResolverStyle.STRICT)
