package com.chengxu.autoservice.core.session

import com.chengxu.autoservice.core.model.AppPermission
import com.chengxu.autoservice.core.model.UserRole

data class PermissionSnapshot(private val granted: Set<AppPermission>) {
    fun allows(permission: AppPermission): Boolean = permission in granted

    companion object {
        fun forRole(role: UserRole): PermissionSnapshot = when (role) {
            UserRole.EMPLOYEE -> PermissionSnapshot(
                setOf(
                    AppPermission.VIEW_ORDER,
                    AppPermission.CREATE_ORDER,
                    AppPermission.EDIT_ORDER,
                    AppPermission.ADVANCE_ORDER_STATUS,
                ),
            )
            UserRole.ADMINISTRATOR -> PermissionSnapshot(AppPermission.entries.toSet())
        }
    }
}
