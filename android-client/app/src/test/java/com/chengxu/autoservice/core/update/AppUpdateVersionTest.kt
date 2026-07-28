package com.chengxu.autoservice.core.update

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class AppUpdateVersionTest {
    @Test
    fun strictlyNewerAcceptsOnlyHigherNumericDotVersions() {
        assertTrue(AppUpdateVersion.isStrictlyNewer("0.1.1", "0.1.0"))
        assertTrue(AppUpdateVersion.isStrictlyNewer("1.0.0", "0.99.99"))
        assertFalse(AppUpdateVersion.isStrictlyNewer("0.1.0", "0.1.0"))
        assertFalse(AppUpdateVersion.isStrictlyNewer("0.0.9", "0.1.0"))
        assertFalse(AppUpdateVersion.isStrictlyNewer("preview", "0.1.0"))
        assertFalse(AppUpdateVersion.isStrictlyNewer("0.1", "0.1.0"))
    }
}
