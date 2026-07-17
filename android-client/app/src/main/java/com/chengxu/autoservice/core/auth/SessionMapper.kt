package com.chengxu.autoservice.core.auth

import com.chengxu.autoservice.core.model.UserRole
import com.chengxu.autoservice.core.session.AppSession
import com.chengxu.autoservice.core.session.PermissionSnapshot

fun RemoteSession.toAppSession(): AppSession = AppSession(
    companyId = companyId,
    companyName = companyNameFor(companyId),
    username = username,
    staffName = displayName,
    token = token,
    role = if (role == "admin") UserRole.ADMINISTRATOR else UserRole.EMPLOYEE,
    permissions = PermissionSnapshot.fromServer(role, permissions),
)

private fun companyNameFor(companyId: String): String = when (companyId) {
    "tongda" -> "通达汽车服务中心"
    "xinqiheng" -> "鑫齐恒汽车服务中心"
    else -> companyId
}
