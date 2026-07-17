package com.chengxu.autoservice.core.auth

interface AuthApi {
    suspend fun login(credentials: AuthCredentials): AuthResult
}

sealed interface AuthResult {
    data class Success(val session: RemoteSession) : AuthResult
    data class Failure(val failure: AuthFailure) : AuthResult
}

enum class AuthFailure {
    InvalidCredentials,
    NetworkUnavailable,
    ServerError,
    MalformedResponse,
    SessionExpired,
}
