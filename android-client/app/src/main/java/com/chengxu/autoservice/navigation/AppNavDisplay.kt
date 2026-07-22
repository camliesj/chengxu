package com.chengxu.autoservice.navigation

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.navigation3.runtime.NavEntry
import androidx.navigation3.ui.NavDisplay
import com.chengxu.autoservice.core.session.AppSession
import com.chengxu.autoservice.ui.create.CreateOrderField
import com.chengxu.autoservice.ui.create.CreateOrderScreen
import com.chengxu.autoservice.ui.create.CreateOrderUiState
import com.chengxu.autoservice.ui.profile.ProfileScreen
import com.chengxu.autoservice.ui.orders.OrderDetailScreen
import com.chengxu.autoservice.ui.orders.OrderStatusFilter
import com.chengxu.autoservice.ui.orders.OrdersScreen
import com.chengxu.autoservice.ui.orders.OrdersUiState
import com.chengxu.autoservice.ui.stage.StageScreen
import com.chengxu.autoservice.ui.stage.StageKind
import com.chengxu.autoservice.ui.workbench.WorkbenchAction
import com.chengxu.autoservice.ui.workbench.WorkbenchScreen
import com.chengxu.autoservice.ui.workbench.WorkbenchUiState

@Composable
fun AppNavDisplay(
    navigationState: AppNavigationState,
    modifier: Modifier = Modifier,
    workbenchState: WorkbenchUiState? = null,
    onWorkbenchAction: (WorkbenchAction) -> Unit = {},
    onWorkbenchRefresh: () -> Unit = {},
    ordersState: OrdersUiState = OrdersUiState(loading = false),
    onOrdersQueryChange: (String) -> Unit = {},
    onOrdersFilterSelected: (OrderStatusFilter) -> Unit = {},
    onOrdersClearFilters: () -> Unit = {},
    onOrdersRefresh: () -> Unit = {},
    createState: CreateOrderUiState = CreateOrderUiState(),
    onCreateUpdate: (CreateOrderField, String) -> Unit = { _, _ -> },
    onCreateNext: () -> Unit = {},
    onCreateBack: () -> Unit = {},
    onCreateSubmit: () -> Unit = {},
    onCreateConfirmUnknown: () -> Unit = {},
    onCreateSaveDraft: () -> Unit = {},
    onCreateExit: () -> Unit = {},
    onCreateContinueEditing: () -> Unit = {},
    onCreateDiscardAndExit: () -> Unit = {},
    onCreateSaveAndExit: () -> Unit = {},
    profileSession: AppSession? = null,
    onLogout: () -> Unit = {},
    isOffline: Boolean = false,
) {
    NavDisplay(
        backStack = navigationState.currentStack,
        modifier = modifier,
        onBack = navigationState::pop,
        entryProvider = { route ->
            NavEntry(route) { entry ->
                when (entry) {
                    AppRoute.Workbench -> workbenchState?.let {
                        WorkbenchScreen(
                            state = it,
                            onAction = onWorkbenchAction,
                            onRefresh = onWorkbenchRefresh,
                            onOrderSelected = { orderId ->
                                navigationState.push(AppRoute.OrderDetail(orderId))
                            },
                        )
                    } ?: WorkbenchShellPlaceholder()
                    AppRoute.Orders -> OrdersScreen(
                        state = ordersState,
                        isOffline = isOffline,
                        onQueryChange = onOrdersQueryChange,
                        onFilterSelected = onOrdersFilterSelected,
                        onClearFilters = onOrdersClearFilters,
                        onRefresh = onOrdersRefresh,
                        onOrderSelected = { orderId ->
                            navigationState.push(AppRoute.OrderDetail(orderId))
                        },
                    )
                    AppRoute.CreateOrder -> CreateOrderScreen(
                        state = createState,
                        onUpdate = onCreateUpdate,
                        onNext = onCreateNext,
                        onBack = onCreateBack,
                        onSubmit = onCreateSubmit,
                        onConfirmUnknown = onCreateConfirmUnknown,
                        onSaveDraft = onCreateSaveDraft,
                        onExit = onCreateExit,
                        onContinueEditing = onCreateContinueEditing,
                        onDiscardAndExit = onCreateDiscardAndExit,
                        onSaveAndExit = onCreateSaveAndExit,
                    )
                    AppRoute.Records -> StageScreen(kind = StageKind.RECORDS, offline = isOffline)
                    AppRoute.Profile -> profileSession?.let {
                        ProfileScreen(session = it, offline = isOffline, onLogout = onLogout)
                    } ?: ShellPlaceholder(title = RootTab.PROFILE.label)
                    is AppRoute.OrderDetail -> OrderDetailScreen(
                        order = ordersState.allOrders.firstOrNull { order -> order.id == entry.orderId },
                        onBack = navigationState::pop,
                    )
                }
            }
        },
    )
}

@Composable
private fun WorkbenchShellPlaceholder() {
    ShellPlaceholder(title = RootTab.WORKBENCH.label)
}

@Composable
private fun ShellPlaceholder(title: String) {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center,
    ) {
        Text(text = title, style = MaterialTheme.typography.headlineSmall)
    }
}
