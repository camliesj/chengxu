package com.chengxu.autoservice.ui.shell

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.disabled
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.chengxu.autoservice.core.designsystem.AutoserviceColors
import com.chengxu.autoservice.core.designsystem.BrandIcon
import com.chengxu.autoservice.core.designsystem.BrandIconResource
import com.chengxu.autoservice.core.model.AppPermission
import com.chengxu.autoservice.core.network.ConnectionState
import com.chengxu.autoservice.core.session.AppSession
import com.chengxu.autoservice.navigation.AppNavDisplay
import com.chengxu.autoservice.navigation.AppNavigationState
import com.chengxu.autoservice.navigation.RootTab
import com.chengxu.autoservice.ui.workbench.WorkbenchAction
import com.chengxu.autoservice.ui.workbench.WorkbenchUiState

@Composable
fun AutoserviceShell(
    connection: ConnectionState,
    modifier: Modifier = Modifier,
    navigationState: AppNavigationState = remember { AppNavigationState() },
    workbenchState: WorkbenchUiState? = null,
    onWorkbenchAction: (WorkbenchAction) -> Unit = {},
    profileSession: AppSession? = null,
    onLogout: () -> Unit = {},
) {
    val isOffline = connection == ConnectionState.Offline
    val routeWorkbenchAction: (WorkbenchAction) -> Unit = { action ->
        when (action.permission) {
            AppPermission.CREATE_ORDER -> navigationState.select(RootTab.CREATE)
            AppPermission.ADVANCE_ORDER_STATUS,
            AppPermission.SETTLE_ORDER -> navigationState.select(RootTab.ORDERS)
            else -> onWorkbenchAction(action)
        }
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(AutoserviceColors.Canvas),
    ) {
        if (isOffline) {
            OfflineBanner()
        }
        AppNavDisplay(
            navigationState = navigationState,
            modifier = Modifier.weight(1f),
            workbenchState = workbenchState,
            onWorkbenchAction = routeWorkbenchAction,
            profileSession = profileSession,
            onLogout = onLogout,
            isOffline = isOffline,
        )
        Surface(
            color = AutoserviceColors.Surface,
            shadowElevation = 0.dp,
            tonalElevation = 0.dp,
        ) {
            NavigationBar(
                containerColor = AutoserviceColors.Surface,
                tonalElevation = 0.dp,
            ) {
                RootTab.entries.forEach { tab ->
                    val selected = navigationState.activeTab == tab
                    val enabled = tab != RootTab.CREATE || !isOffline
                    val primary = tab == RootTab.CREATE
                    NavigationBarItem(
                        selected = selected,
                        onClick = { navigationState.select(tab) },
                        enabled = enabled,
                        icon = {
                            if (primary) {
                                Surface(
                                    modifier = Modifier.size(48.dp),
                                    shape = CircleShape,
                                    color = if (enabled) AutoserviceColors.Action else AutoserviceColors.SurfaceSoft,
                                    contentColor = if (enabled) AutoserviceColors.Surface else AutoserviceColors.InkMuted,
                                    shadowElevation = if (enabled) 6.dp else 0.dp,
                                ) {
                                    BrandIcon(
                                        resource = tab.icon,
                                        contentDescription = null,
                                        modifier = Modifier.padding(14.dp).size(20.dp),
                                        tint = if (enabled) AutoserviceColors.Surface else AutoserviceColors.InkMuted,
                                    )
                                }
                            } else {
                                BrandIcon(
                                    resource = tab.icon,
                                    contentDescription = null,
                                    modifier = Modifier.size(22.dp),
                                    tint = if (selected) AutoserviceColors.Ink else AutoserviceColors.InkMuted,
                                )
                            }
                        },
                        label = {
                            Text(
                                text = tab.label,
                                modifier = Modifier.semantics { if (!enabled) disabled() },
                                fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
                            )
                        },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = AutoserviceColors.Ink,
                            selectedTextColor = AutoserviceColors.Ink,
                            unselectedIconColor = AutoserviceColors.InkMuted,
                            unselectedTextColor = AutoserviceColors.InkMuted,
                            disabledIconColor = AutoserviceColors.InkMuted,
                            disabledTextColor = AutoserviceColors.InkMuted,
                            indicatorColor = if (primary) Color.Transparent else AutoserviceColors.Ice,
                        ),
                        modifier = Modifier.testTag("root-tab"),
                    )
                }
            }
        }
    }
}

private val RootTab.icon: BrandIconResource
    get() = when (this) {
        RootTab.WORKBENCH -> BrandIconResource.Home
        RootTab.ORDERS -> BrandIconResource.Orders
        RootTab.CREATE -> BrandIconResource.Add
        RootTab.RECORDS -> BrandIconResource.Records
        RootTab.PROFILE -> BrandIconResource.Profile
    }
