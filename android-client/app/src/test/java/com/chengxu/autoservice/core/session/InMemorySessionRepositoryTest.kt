package com.chengxu.autoservice.core.session

import com.chengxu.autoservice.core.model.AppPermission
import com.chengxu.autoservice.core.model.UserRole
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class InMemorySessionRepositoryTest {
    @Test
    fun roleUpdateRebuildsPermissionSnapshot() = runTest {
        val repository = InMemorySessionRepository(employeeSession())

        repository.setDebugRole(UserRole.ADMINISTRATOR)

        val session = requireNotNull(repository.session.value)
        assertEquals(UserRole.ADMINISTRATOR, session.role)
        assertTrue(session.permissions.allows(AppPermission.SETTLE_ORDER))
    }

    private fun employeeSession() = AppSession(
        companyName = "Chengxu Auto Service",
        staffName = "Test Employee",
        role = UserRole.EMPLOYEE,
        permissions = PermissionSnapshot.forRole(UserRole.EMPLOYEE),
    )
}
