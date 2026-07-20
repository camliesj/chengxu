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
import com.chengxu.autoservice.ui.profile.ProfileScreen
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
                        )
                    } ?: WorkbenchShellPlaceholder()
                    AppRoute.Orders -> StageScreen(kind = StageKind.ORDERS, offline = isOffline)
                    AppRoute.CreateOrder -> StageScreen(kind = StageKind.CREATE, offline = isOffline)
                    AppRoute.Records -> StageScreen(kind = StageKind.RECORDS, offline = isOffline)
                    AppRoute.Profile -> profileSession?.let {
                        ProfileScreen(session = it, offline = isOffline, onLogout = onLogout)
                    } ?: ShellPlaceholder(title = RootTab.PROFILE.label)
                    is AppRoute.OrderDetail -> ShellPlaceholder(title = "工单详情")
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
