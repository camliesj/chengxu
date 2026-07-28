package com.chengxu.autoservice

import org.junit.Assert.assertEquals
import org.junit.Test

class BuildSanityTest {
    @Test fun applicationNameContract() {
        assertEquals("智纬", AppIdentity.displayName)
    }
}
