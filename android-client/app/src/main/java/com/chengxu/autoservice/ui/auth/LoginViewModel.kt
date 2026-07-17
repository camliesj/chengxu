package com.chengxu.autoservice.ui.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chengxu.autoservice.core.auth.AuthCredentials
import com.chengxu.autoservice.core.auth.AuthenticationRepository
import com.chengxu.autoservice.core.auth.AuthenticationState
import com.chengxu.autoservice.core.network.ConnectionState
import com.chengxu.autoservice.core.network.NetworkMonitor
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class LoginUiState(
    val companyId: String = "tongda",
    val username: String = "",
    val password: String = "",
    val submitting: Boolean = false,
    val errorMessage: String? = null,
)

class LoginViewModel(
    private val authenticationRepository: AuthenticationRepository,
    private val networkMonitor: NetworkMonitor,
    initialErrorMessage: String? = null,
) : ViewModel() {
    private val mutableUiState = MutableStateFlow(LoginUiState(errorMessage = initialErrorMessage))
    val uiState: StateFlow<LoginUiState> = mutableUiState.asStateFlow()

    fun selectCompany(companyId: String) = mutableUiState.update { it.copy(companyId = companyId, errorMessage = null) }
    fun updateUsername(username: String) = mutableUiState.update { it.copy(username = username, errorMessage = null) }
    fun updatePassword(password: String) = mutableUiState.update { it.copy(password = password, errorMessage = null) }
    fun syncAuthenticationMessage(message: String?) = mutableUiState.update { it.copy(errorMessage = message) }

    fun submit() {
        val current = mutableUiState.value
        if (current.username.isBlank() || current.password.isBlank()) {
            mutableUiState.update { it.copy(errorMessage = "请填写账号和密码") }
            return
        }
        if (networkMonitor.connection.value == ConnectionState.Offline) {
            mutableUiState.update { it.copy(errorMessage = "网络不可用，请检查网络连接后重试") }
            return
        }
        if (current.submitting) return

        mutableUiState.update { it.copy(submitting = true, errorMessage = null) }
        viewModelScope.launch {
            authenticationRepository.login(
                AuthCredentials(current.companyId, current.username.trim(), current.password),
            )
            val authenticationState = authenticationRepository.state.value
            mutableUiState.update {
                it.copy(
                    password = if (authenticationState is AuthenticationState.Authenticated) "" else it.password,
                    submitting = false,
                    errorMessage = (authenticationState as? AuthenticationState.Unauthenticated)?.message,
                )
            }
        }
    }
}
