package com.chengxu.autoservice

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.ViewModelStore
import androidx.lifecycle.ViewModelStoreOwner
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.chengxu.autoservice.core.auth.AuthenticationRepository
import com.chengxu.autoservice.core.auth.AuthenticationState
import com.chengxu.autoservice.core.designsystem.AutoserviceTheme
import com.chengxu.autoservice.core.designsystem.AutoserviceColors
import com.chengxu.autoservice.core.designsystem.AutoservicePanelShape
import com.chengxu.autoservice.core.designsystem.AutoserviceSpacing
import com.chengxu.autoservice.core.designsystem.BrandIcon
import com.chengxu.autoservice.core.designsystem.BrandIconResource
import com.chengxu.autoservice.core.network.NetworkMonitor
import com.chengxu.autoservice.ui.auth.LoginScreen
import com.chengxu.autoservice.ui.auth.LoginViewModel
import com.chengxu.autoservice.ui.shell.AutoserviceShell
import com.chengxu.autoservice.ui.workbench.WorkbenchRepository
import com.chengxu.autoservice.ui.workbench.WorkbenchViewModel
import kotlinx.coroutines.launch

@Composable
fun AutoserviceApp(
    authenticationRepository: AuthenticationRepository,
    networkMonitor: NetworkMonitor,
    workbenchRepository: WorkbenchRepository,
) {
    val authenticationState by authenticationRepository.state.collectAsStateWithLifecycle()

    LaunchedEffect(authenticationRepository) {
        authenticationRepository.restore()
    }

    AutoserviceTheme {
        when (val state = authenticationState) {
            AuthenticationState.Restoring -> BrandRestoringScreen()

            is AuthenticationState.Unauthenticated -> LoginRoot(
                authenticationRepository = authenticationRepository,
                networkMonitor = networkMonitor,
                initialErrorMessage = state.message,
            )

            is AuthenticationState.Authenticated -> AuthenticatedRoot(
                authenticationRepository = authenticationRepository,
                networkMonitor = networkMonitor,
                workbenchRepository = workbenchRepository,
                authenticationState = state,
            )
        }
    }
}

@Composable
private fun BrandRestoringScreen() {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(AutoserviceColors.Canvas),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Md),
        ) {
            Surface(
                shape = AutoservicePanelShape,
                color = AutoserviceColors.Ice,
                contentColor = AutoserviceColors.Ink,
            ) {
                BrandIcon(
                    resource = BrandIconResource.Car,
                    contentDescription = null,
                    modifier = Modifier.padding(AutoserviceSpacing.Lg).size(32.dp),
                )
            }
            CircularProgressIndicator(
                modifier = Modifier.size(24.dp),
                color = AutoserviceColors.Action,
                strokeWidth = 2.dp,
            )
            Text(
                text = "正在安全恢复登录状态",
                style = MaterialTheme.typography.bodyMedium,
                color = AutoserviceColors.InkMuted,
            )
        }
    }
}

@Composable
private fun LoginRoot(
    authenticationRepository: AuthenticationRepository,
    networkMonitor: NetworkMonitor,
    initialErrorMessage: String?,
) {
    val loginViewModel: LoginViewModel = viewModel(
        factory = loginViewModelFactory(authenticationRepository, networkMonitor, initialErrorMessage),
    )
    val state by loginViewModel.uiState.collectAsStateWithLifecycle()

    LaunchedEffect(initialErrorMessage) {
        loginViewModel.syncAuthenticationMessage(initialErrorMessage)
    }

    LoginScreen(
        state = state,
        onCompanySelected = loginViewModel::selectCompany,
        onUsernameChanged = loginViewModel::updateUsername,
        onPasswordChanged = loginViewModel::updatePassword,
        onLogin = loginViewModel::submit,
    )
}

@Composable
private fun AuthenticatedRoot(
    authenticationRepository: AuthenticationRepository,
    networkMonitor: NetworkMonitor,
    workbenchRepository: WorkbenchRepository,
    authenticationState: AuthenticationState.Authenticated,
) {
    val sessionViewModelStoreOwner = remember(authenticationState.session) {
        SessionViewModelStoreOwner()
    }
    DisposableEffect(sessionViewModelStoreOwner) {
        onDispose { sessionViewModelStoreOwner.viewModelStore.clear() }
    }
    val workbenchViewModel: WorkbenchViewModel = viewModel(
        viewModelStoreOwner = sessionViewModelStoreOwner,
        factory = workbenchViewModelFactory(authenticationRepository, networkMonitor, workbenchRepository),
    )
    val state by workbenchViewModel.uiState.collectAsStateWithLifecycle()
    val scope = rememberCoroutineScope()

    AutoserviceShell(
        connection = state.connection,
        workbenchState = state,
        onWorkbenchAction = {},
        profileSession = authenticationState.session,
        onLogout = { scope.launch { authenticationRepository.logout() } },
    )
}

private class SessionViewModelStoreOwner : ViewModelStoreOwner {
    override val viewModelStore = ViewModelStore()
}

private fun loginViewModelFactory(
    authenticationRepository: AuthenticationRepository,
    networkMonitor: NetworkMonitor,
    initialErrorMessage: String?,
): ViewModelProvider.Factory = object : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(LoginViewModel::class.java)) {
            return LoginViewModel(authenticationRepository, networkMonitor, initialErrorMessage) as T
        }
        throw IllegalArgumentException("Unsupported ViewModel class: ${modelClass.name}")
    }
}

private fun workbenchViewModelFactory(
    authenticationRepository: AuthenticationRepository,
    networkMonitor: NetworkMonitor,
    workbenchRepository: WorkbenchRepository,
): ViewModelProvider.Factory = object : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(WorkbenchViewModel::class.java)) {
            return WorkbenchViewModel(authenticationRepository, networkMonitor, workbenchRepository) as T
        }
        throw IllegalArgumentException("Unsupported ViewModel class: ${modelClass.name}")
    }
}
