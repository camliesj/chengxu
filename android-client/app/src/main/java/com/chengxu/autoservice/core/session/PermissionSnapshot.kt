package com.chengxu.autoservice.core.session

import com.chengxu.autoservice.core.model.AppPermission
import com.chengxu.autoservice.core.model.UserRole

data class PermissionSnapshot(private val granted: Set<AppPermission>) {
    fun allows(permission: AppPermission): Boolean = permission in granted

    companion object {
        fun fromServer(role: String, permissionKeys: List<String>): PermissionSnapshot {
            if (role == "admin") return PermissionSnapshot(AppPermission.entries.toSet())

            return PermissionSnapshot(
                permissionKeys.flatMap(::permissionsForServerKey).toSet(),
            )
        }

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

        private fun permissionsForServerKey(key: String): Set<AppPermission> = when (key) {
            "repair" -> setOf(
                AppPermission.VIEW_ORDER,
                AppPermission.CREATE_ORDER,
                AppPermission.EDIT_ORDER,
                AppPermission.ADVANCE_ORDER_STATUS,
            )
            "voidOrder" -> setOf(AppPermission.VOID_ORDER)
            else -> emptySet()
        }
    }
}
