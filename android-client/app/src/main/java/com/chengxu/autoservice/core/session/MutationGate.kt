package com.chengxu.autoservice.core.session

import com.chengxu.autoservice.core.model.AppPermission
import com.chengxu.autoservice.core.network.ConnectionState

sealed interface MutationDecision {
    data object Allowed : MutationDecision

    data class Denied(val reason: String) : MutationDecision
}

object MutationGate {
    fun evaluate(
        connection: ConnectionState,
        permission: AppPermission,
        snapshot: PermissionSnapshot,
    ): MutationDecision = when {
        connection == ConnectionState.Offline -> MutationDecision.Denied("网络不可用，当前为只读模式")
        !snapshot.allows(permission) -> MutationDecision.Denied("当前账号无此操作权限")
        else -> MutationDecision.Allowed
    }
}
