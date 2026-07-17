package com.chengxu.autoservice.ui.shell

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AddCircleOutline
import androidx.compose.material.icons.outlined.Dashboard
import androidx.compose.material.icons.outlined.Description
import androidx.compose.material.icons.outlined.FolderOpen
import androidx.compose.material.icons.outlined.PersonOutline
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.disabled
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.platform.testTag
import com.chengxu.autoservice.core.network.ConnectionState
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
) {
    val isOffline = connection == ConnectionState.Offline

    Column(modifier = modifier.fillMaxSize()) {
        if (isOffline) {
            OfflineBanner()
        }
        AppNavDisplay(
            navigationState = navigationState,
            modifier = Modifier.weight(1f),
            workbenchState = workbenchState,
            onWorkbenchAction = onWorkbenchAction,
        )
        NavigationBar {
            RootTab.entries.forEach { tab ->
                val enabled = tab != RootTab.CREATE || !isOffline
                NavigationBarItem(
                    selected = navigationState.activeTab == tab,
                    onClick = { navigationState.select(tab) },
                    enabled = enabled,
                    icon = { Icon(imageVector = tab.icon, contentDescription = null) },
                    label = {
                        Text(
                            text = tab.label,
                            modifier = Modifier.semantics {
                                if (!enabled) disabled()
                            },
                        )
                    },
                    modifier = Modifier.testTag("root-tab"),
                )
            }
        }
    }
}

private val RootTab.icon: ImageVector
    get() = when (this) {
        RootTab.WORKBENCH -> Icons.Outlined.Dashboard
        RootTab.ORDERS -> Icons.Outlined.Description
        RootTab.CREATE -> Icons.Outlined.AddCircleOutline
        RootTab.RECORDS -> Icons.Outlined.FolderOpen
        RootTab.PROFILE -> Icons.Outlined.PersonOutline
    }
