package com.chengxu.autoservice.core.auth

import com.chengxu.autoservice.core.session.AppSession
import com.chengxu.autoservice.core.session.SessionRepository
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

sealed interface AuthenticationState {
    data object Restoring : AuthenticationState
    data class Unauthenticated(val message: String? = null) : AuthenticationState
    data class Authenticated(val session: AppSession) : AuthenticationState
}

class AuthenticationRepository(
    private val authApi: AuthApi,
    private val sessionStore: SessionStore,
) : SessionRepository {
    private val mutableState = MutableStateFlow<AuthenticationState>(AuthenticationState.Restoring)
    private val mutableSession = MutableStateFlow<AppSession?>(null)

    val state: StateFlow<AuthenticationState> = mutableState.asStateFlow()
    override val session: StateFlow<AppSession?> = mutableSession.asStateFlow()

    suspend fun restore() {
        mutableState.value = AuthenticationState.Restoring
        val restored = sessionStore.read()
        if (restored == null) {
            mutableState.value = AuthenticationState.Unauthenticated()
        } else {
            publishAuthenticated(restored)
        }
    }

    suspend fun login(credentials: AuthCredentials) {
        when (val result = authApi.login(credentials)) {
            is AuthResult.Success -> {
                val authenticated = result.session.toAppSession()
                try {
                    sessionStore.write(authenticated)
                    publishAuthenticated(authenticated)
                } catch (failure: Exception) {
                    if (failure is CancellationException) throw failure
                    mutableSession.value = null
                    mutableState.value = AuthenticationState.Unauthenticated(SESSION_STORAGE_ERROR_MESSAGE)
                }
            }
            is AuthResult.Failure -> {
                mutableState.value = AuthenticationState.Unauthenticated(result.failure.loginMessage())
            }
        }
    }

    suspend fun logout() {
        sessionStore.clear()
        mutableSession.value = null
        mutableState.value = AuthenticationState.Unauthenticated()
    }

    suspend fun invalidate(failure: AuthFailure) {
        sessionStore.clear()
        mutableSession.value = null
        mutableState.value = AuthenticationState.Unauthenticated(
            if (failure == AuthFailure.SessionExpired) "登录已过期，请重新登录" else "登录状态无效，请重新登录",
        )
    }

    private fun publishAuthenticated(appSession: AppSession) {
        mutableSession.value = appSession
        mutableState.value = AuthenticationState.Authenticated(appSession)
    }

    private companion object {
        const val SESSION_STORAGE_ERROR_MESSAGE = "无法安全保存登录状态，请重试"
    }
}

private fun AuthFailure.loginMessage(): String = when (this) {
    AuthFailure.InvalidCredentials -> "账号、密码或公司不正确"
    AuthFailure.NetworkUnavailable -> "网络不可用，请检查网络连接后重试"
    AuthFailure.ServerError -> "服务器暂时不可用，请稍后重试"
    AuthFailure.MalformedResponse -> "服务器响应异常，请稍后重试"
    AuthFailure.SessionExpired -> "登录已过期，请重新登录"
}
