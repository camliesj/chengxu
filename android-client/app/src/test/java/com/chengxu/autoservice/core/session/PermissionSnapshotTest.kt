package com.chengxu.autoservice.core.session

import com.chengxu.autoservice.core.model.AppPermission
import com.chengxu.autoservice.core.model.UserRole
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PermissionSnapshotTest {
    @Test
    fun employeeCannotPerformAdministrativeMutations() {
        val snapshot = PermissionSnapshot.forRole(UserRole.EMPLOYEE)

        assertTrue(snapshot.allows(AppPermission.ADVANCE_ORDER_STATUS))
        assertTrue(snapshot.allows(AppPermission.VIEW_RECORDS))
        assertFalse(snapshot.allows(AppPermission.SETTLE_ORDER))
        assertFalse(snapshot.allows(AppPermission.REVERSE_SETTLEMENT))
        assertFalse(snapshot.allows(AppPermission.VOID_ORDER))
        assertFalse(snapshot.allows(AppPermission.MAINTAIN_RECEIPT))
        assertFalse(snapshot.allows(AppPermission.MANAGE_RECORDS))
        assertFalse(snapshot.allows(AppPermission.EXPORT_DATA))
    }

    @Test
    fun administratorHasAdministrativeMutations() {
        val snapshot = PermissionSnapshot.forRole(UserRole.ADMINISTRATOR)

        assertTrue(AppPermission.entries.all(snapshot::allows))
    }

    @Test
    fun serverKeysCannotElevateStaffToAdministrativeCapabilities() {
        val snapshot = PermissionSnapshot.fromServer(
            role = "staff",
            permissionKeys = listOf("history", "insurance", "customers", "export", "voidOrder"),
        )

        assertTrue(snapshot.allows(AppPermission.VIEW_RECORDS))
        assertFalse(snapshot.allows(AppPermission.EXPORT_DATA))
        assertFalse(snapshot.allows(AppPermission.VOID_ORDER))
        assertFalse(snapshot.allows(AppPermission.MANAGE_RECORDS))
    }
}
