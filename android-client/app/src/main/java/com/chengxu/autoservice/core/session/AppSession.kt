package com.chengxu.autoservice.core.session

import com.chengxu.autoservice.core.model.UserRole

data class AppSession(
    val companyName: String,
    val staffName: String,
    val role: UserRole,
    val permissions: PermissionSnapshot,
)
