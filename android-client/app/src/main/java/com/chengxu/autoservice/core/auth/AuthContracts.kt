package com.chengxu.autoservice.core.auth

import kotlinx.serialization.Serializable

data class AuthCredentials(
    val companyId: String,
    val username: String,
    val password: String,
)

@Serializable
data class RemoteSession(
    val token: String,
    val role: String,
    val companyId: String,
    val username: String,
    val displayName: String,
    val permissions: List<String> = emptyList(),
)
