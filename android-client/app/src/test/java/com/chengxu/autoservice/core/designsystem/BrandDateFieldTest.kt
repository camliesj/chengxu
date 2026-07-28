package com.chengxu.autoservice.core.designsystem

import java.time.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Test

class BrandDateFieldTest {
    @Test
    fun `uses the current value when it is an ISO date`() {
        val fallback = LocalDate.of(2026, 7, 28)

        assertEquals(LocalDate.of(2027, 8, 9), datePickerInitialDate("2027-08-09", fallback))
    }

    @Test
    fun `falls back to the supplied date for a blank or invalid value`() {
        val fallback = LocalDate.of(2026, 7, 28)

        assertEquals(fallback, datePickerInitialDate("", fallback))
        assertEquals(fallback, datePickerInitialDate("2026/07/28", fallback))
    }
}
