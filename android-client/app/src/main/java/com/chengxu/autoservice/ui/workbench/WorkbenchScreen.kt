package com.chengxu.autoservice.ui.workbench

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import com.chengxu.autoservice.core.designsystem.AutoserviceColors
import com.chengxu.autoservice.core.designsystem.AutoserviceSpacing
import com.chengxu.autoservice.core.designsystem.BrandButton
import com.chengxu.autoservice.core.designsystem.BrandButtonTone
import com.chengxu.autoservice.core.session.MutationDecision
import kotlinx.coroutines.launch

@Composable
fun WorkbenchScreen(
    state: WorkbenchUiState,
    onAction: (WorkbenchAction) -> Unit,
    onRefresh: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val snackbarHostState = remember { SnackbarHostState() }
    val coroutineScope = rememberCoroutineScope()
    val metrics = if (state.businessMetrics.isNotEmpty()) state.businessMetrics else state.metrics
    val isAdministrator = state.businessMetrics.isNotEmpty()

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(AutoserviceColors.Canvas),
    ) {
        if (state.loading && state.recentOrders.isEmpty()) {
            Text(
                text = "正在加载工作台",
                modifier = Modifier.padding(AutoserviceSpacing.Lg),
                style = MaterialTheme.typography.bodyMedium,
                color = AutoserviceColors.InkMuted,
            )
        } else {
            Column(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = AutoserviceSpacing.Lg, vertical = AutoserviceSpacing.Xl),
                verticalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Lg),
            ) {
                WorkbenchHero(state = state, isAdministrator = isAdministrator)
                WorkbenchStatusBand(metrics = state.statusMetrics)

                WorkbenchSectionTitle(
                    title = if (isAdministrator) "经营概览" else "今日概览",
                    supportingText = "实时演示数据",
                )
                WorkbenchMetricGrid(metrics)

                WorkbenchSectionTitle(title = "快捷操作")
                WorkbenchQuickActions(
                    actions = state.quickActions,
                    onAction = { action ->
                        when (val decision = action.decision) {
                            MutationDecision.Allowed -> onAction(action)
                            is MutationDecision.Denied -> coroutineScope.launch {
                                snackbarHostState.showSnackbar(decision.reason)
                            }
                        }
                    },
                )

                WorkbenchSectionTitle(
                    title = if (isAdministrator) "优先事项" else "我的待办",
                )
                if (state.refreshing || state.syncMessage != null) {
                    Column(verticalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Sm)) {
                        if (state.refreshing) {
                            Text(
                                text = "正在同步…",
                                style = MaterialTheme.typography.bodySmall,
                                color = AutoserviceColors.InkMuted,
                            )
                        }
                        state.syncMessage?.let { message ->
                            Text(
                                text = message,
                                style = MaterialTheme.typography.bodySmall,
                                color = AutoserviceColors.Warning,
                            )
                        }
                        if (state.showRetry) {
                            BrandButton(
                                onClick = onRefresh,
                                tone = BrandButtonTone.SECONDARY,
                            ) {
                                Text("重新同步")
                            }
                        }
                    }
                }
                Column(verticalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Sm)) {
                    if (state.recentOrders.isEmpty()) {
                        Text(
                            text = "暂无工单数据",
                            style = MaterialTheme.typography.bodyMedium,
                            color = AutoserviceColors.InkMuted,
                        )
                    } else {
                        state.recentOrders.forEach { order ->
                            WorkbenchOrderCard(
                                order = order,
                                onClick = {
                                    coroutineScope.launch {
                                        snackbarHostState.showSnackbar("${order.orderNumber} 详情将在后续阶段接入")
                                    }
                                },
                            )
                        }
                    }
                }
            }
        }
        SnackbarHost(hostState = snackbarHostState)
    }
}
