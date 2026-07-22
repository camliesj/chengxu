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
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.ViewModelStore
import androidx.lifecycle.ViewModelStoreOwner
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.compose.LocalLifecycleOwner
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
import com.chengxu.autoservice.core.orders.OrdersRepository
import com.chengxu.autoservice.core.orders.OrderCreationRepository
import com.chengxu.autoservice.navigation.AppNavigationState
import com.chengxu.autoservice.navigation.RootTab
import com.chengxu.autoservice.ui.auth.LoginScreen
import com.chengxu.autoservice.ui.auth.LoginViewModel
import com.chengxu.autoservice.ui.shell.AutoserviceShell
import com.chengxu.autoservice.ui.orders.OrdersViewModel
import com.chengxu.autoservice.ui.create.CreateOrderEvent
import com.chengxu.autoservice.ui.create.CreateOrderViewModel
import com.chengxu.autoservice.ui.workbench.WorkbenchViewModel
import kotlinx.coroutines.launch

@Composable
fun AutoserviceApp(
    authenticationRepository: AuthenticationRepository,
    networkMonitor: NetworkMonitor,
    ordersRepository: OrdersRepository,
    orderCreationRepository: OrderCreationRepository,
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
                ordersRepository = ordersRepository,
                orderCreationRepository = orderCreationRepository,
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
    ordersRepository: OrdersRepository,
    orderCreationRepository: OrderCreationRepository,
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
        factory = workbenchViewModelFactory(authenticationRepository, networkMonitor, ordersRepository),
    )
    val ordersViewModel: OrdersViewModel = viewModel(
        viewModelStoreOwner = sessionViewModelStoreOwner,
        factory = ordersViewModelFactory(ordersRepository),
    )
    val createOrderViewModel: CreateOrderViewModel = viewModel(
        viewModelStoreOwner = sessionViewModelStoreOwner,
        factory = createOrderViewModelFactory(orderCreationRepository, networkMonitor),
    )
    val state by workbenchViewModel.uiState.collectAsStateWithLifecycle()
    val ordersState by ordersViewModel.uiState.collectAsStateWithLifecycle()
    val createState by createOrderViewModel.uiState.collectAsStateWithLifecycle()
    val navigationState = remember(authenticationState.session) { AppNavigationState() }
    val lifecycleOwner = LocalLifecycleOwner.current
    val scope = rememberCoroutineScope()

    DisposableEffect(lifecycleOwner, createOrderViewModel) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_STOP) createOrderViewModel.flushDraft()
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    LaunchedEffect(createOrderViewModel, navigationState) {
        createOrderViewModel.events.collect { event ->
            when (event) {
                is CreateOrderEvent.Created -> navigationState.openCreatedOrder(event.orderId)
                CreateOrderEvent.Exit -> navigationState.select(RootTab.WORKBENCH)
            }
        }
    }

    AutoserviceShell(
        connection = state.connection,
        navigationState = navigationState,
        workbenchState = state,
        onWorkbenchAction = {},
        onWorkbenchRefresh = workbenchViewModel::refresh,
        ordersState = ordersState,
        onOrdersQueryChange = ordersViewModel::updateQuery,
        onOrdersFilterSelected = ordersViewModel::selectFilter,
        onOrdersClearFilters = ordersViewModel::clearFilters,
        onOrdersRefresh = ordersViewModel::refresh,
        createState = createState,
        onCreateUpdate = createOrderViewModel::update,
        onCreateNext = createOrderViewModel::next,
        onCreateBack = createOrderViewModel::back,
        onCreateSubmit = createOrderViewModel::submit,
        onCreateConfirmUnknown = createOrderViewModel::confirmUnknownResult,
        onCreateSaveDraft = createOrderViewModel::saveDraft,
        onCreateExit = createOrderViewModel::requestExit,
        onCreateContinueEditing = createOrderViewModel::continueEditing,
        onCreateDiscardAndExit = createOrderViewModel::discardAndExit,
        onCreateSaveAndExit = createOrderViewModel::saveAndExit,
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
    ordersRepository: OrdersRepository,
): ViewModelProvider.Factory = object : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(WorkbenchViewModel::class.java)) {
            return WorkbenchViewModel(authenticationRepository, networkMonitor, ordersRepository) as T
        }
        throw IllegalArgumentException("Unsupported ViewModel class: ${modelClass.name}")
    }
}

private fun ordersViewModelFactory(
    ordersRepository: OrdersRepository,
): ViewModelProvider.Factory = object : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(OrdersViewModel::class.java)) {
            return OrdersViewModel(ordersRepository) as T
        }
        throw IllegalArgumentException("Unsupported ViewModel class: ${modelClass.name}")
    }
}

private fun createOrderViewModelFactory(
    orderCreationRepository: OrderCreationRepository,
    networkMonitor: NetworkMonitor,
): ViewModelProvider.Factory = object : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(CreateOrderViewModel::class.java)) {
            return CreateOrderViewModel(orderCreationRepository, networkMonitor) as T
        }
        throw IllegalArgumentException("Unsupported ViewModel class: ${modelClass.name}")
    }
}
