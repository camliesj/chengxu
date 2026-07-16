package com.chengxu.autoservice.core.session

import com.chengxu.autoservice.core.model.AppPermission
import com.chengxu.autoservice.core.model.UserRole
import com.chengxu.autoservice.core.network.ConnectionState
import org.junit.Assert.assertEquals
import org.junit.Test

class MutationGateTest {
    @Test
    fun onlineAdministratorWithGrantedPermissionAllowsMutation() {
        val decision = MutationGate.evaluate(
            ConnectionState.Online,
            AppPermission.CREATE_ORDER,
            PermissionSnapshot.forRole(UserRole.ADMINISTRATOR),
        )

        assertEquals(MutationDecision.Allowed, decision)
    }

    @Test
    fun offlineAlwaysRejectsMutationWithReadableReason() {
        val decision = MutationGate.evaluate(
            ConnectionState.Offline,
            AppPermission.CREATE_ORDER,
            PermissionSnapshot.forRole(UserRole.ADMINISTRATOR),
        )

        assertEquals(MutationDecision.Denied("网络不可用，当前为只读模式"), decision)
    }

    @Test
    fun offlineDenialTakesPriorityOverPermissionDenial() {
        val decision = MutationGate.evaluate(
            ConnectionState.Offline,
            AppPermission.SETTLE_ORDER,
            PermissionSnapshot.forRole(UserRole.EMPLOYEE),
        )

        assertEquals(MutationDecision.Denied("网络不可用，当前为只读模式"), decision)
    }

    @Test
    fun onlineEmployeeStillCannotSettle() {
        val decision = MutationGate.evaluate(
            ConnectionState.Online,
            AppPermission.SETTLE_ORDER,
            PermissionSnapshot.forRole(UserRole.EMPLOYEE),
        )

        assertEquals(MutationDecision.Denied("当前账号无此操作权限"), decision)
    }
}
