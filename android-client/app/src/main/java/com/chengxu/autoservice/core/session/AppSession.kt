package com.chengxu.autoservice.core.session

import com.chengxu.autoservice.core.model.UserRole

data class AppSession(
    val companyId: String = "",
    val companyName: String,
    val username: String = "",
    val staffName: String,
    val token: String = "",
    val role: UserRole,
    val permissions: PermissionSnapshot,
)
