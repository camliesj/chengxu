package com.chengxu.autoservice.ui.auth

import androidx.compose.ui.unit.dp
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class LoginLayoutPolicyTest {
    @Test
    fun regularLayoutKeepsTheVehicleInA200DpHero() {
        val spec = loginLayoutSpec(imeVisible = false)

        assertEquals(200.dp, spec.heroHeight)
        assertEquals(16.dp, spec.panelOverlap)
        assertEquals(154.dp, spec.vehicleSlotHeight)
        assertTrue(spec.showVehicle)
        assertTrue(spec.showMarketingTitle)
    }

    @Test
    fun imeLayoutUsesA96DpContextOnlyHero() {
        val spec = loginLayoutSpec(imeVisible = true)

        assertEquals(96.dp, spec.heroHeight)
        assertEquals(16.dp, spec.panelOverlap)
        assertEquals(0.dp, spec.vehicleSlotHeight)
        assertFalse(spec.showVehicle)
        assertFalse(spec.showMarketingTitle)
    }
}
