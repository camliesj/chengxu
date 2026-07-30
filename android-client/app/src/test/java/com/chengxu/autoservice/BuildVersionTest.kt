package com.chengxu.autoservice

import org.junit.Assert.assertEquals
import org.junit.Test

class BuildVersionTest {
    @Test
    fun buildConfigExposesReleaseVersion_0_1_2() {
        assertEquals("0.1.2", BuildConfig.VERSION_NAME)
        assertEquals(3, BuildConfig.VERSION_CODE)
    }
}
