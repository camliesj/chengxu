package com.chengxu.autoservice.core.designsystem

import org.junit.Assert.assertEquals
import org.junit.Test

class AutoserviceThemeTest {
    @Test
    fun materialShapesUseTheUniformAutoserviceRadius() {
        assertEquals(AutoserviceShape, AutoserviceShapes.extraSmall)
        assertEquals(AutoserviceShape, AutoserviceShapes.small)
        assertEquals(AutoserviceShape, AutoserviceShapes.medium)
        assertEquals(AutoserviceShape, AutoserviceShapes.large)
        assertEquals(AutoserviceShape, AutoserviceShapes.extraLarge)
    }
}
