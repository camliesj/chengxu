package com.chengxu.autoservice.core.auth

import com.chengxu.autoservice.core.model.AppPermission
import com.chengxu.autoservice.core.model.UserRole
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class SessionMapperTest {
    @Test
    fun staffMapsOnlyKnownReturnedPermissions() {
        val session = RemoteSession(
            token = "token-123",
            role = "staff",
            companyId = "tongda",
            username = "worker",
            displayName = "通达员工",
            permissions = listOf("repair", "unknown", "voidOrder"),
        ).toAppSession()

        assertEquals(UserRole.EMPLOYEE, session.role)
        assertTrue(session.permissions.allows(AppPermission.CREATE_ORDER))
        assertTrue(session.permissions.allows(AppPermission.VOID_ORDER))
        assertFalse(session.permissions.allows(AppPermission.SETTLE_ORDER))
    }

    @Test
    fun administratorMapsToEveryAndroidPermission() {
        val permissions = RemoteSession(
            token = "token-123",
            role = "admin",
            companyId = "xinqiheng",
            username = "admin",
            displayName = "管理员",
        ).toAppSession().permissions

        assertTrue(AppPermission.entries.all(permissions::allows))
    }
}
