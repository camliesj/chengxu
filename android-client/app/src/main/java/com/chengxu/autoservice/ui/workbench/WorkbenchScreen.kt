package com.chengxu.autoservice.ui.workbench

import androidx.compose.foundation.layout.Column
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
import com.chengxu.autoservice.core.designsystem.AutoserviceSpacing
import com.chengxu.autoservice.core.session.MutationDecision
import kotlinx.coroutines.launch

@Composable
fun WorkbenchScreen(
    state: WorkbenchUiState,
    onAction: (WorkbenchAction) -> Unit,
    modifier: Modifier = Modifier,
) {
    val snackbarHostState = remember { SnackbarHostState() }
    val coroutineScope = rememberCoroutineScope()

    Column(modifier = modifier) {
        if (state.loading) {
            Text(
                text = "正在加载工作台",
                modifier = Modifier.padding(AutoserviceSpacing.Lg),
                style = MaterialTheme.typography.bodyMedium,
            )
        } else {
            Column(
                modifier = Modifier
                    .weight(1f)
                    .verticalScroll(rememberScrollState())
                    .padding(AutoserviceSpacing.Lg),
            ) {
                WorkbenchHeader(state)
                if (state.sections.contains(WorkbenchSection.BUSINESS_SUMMARY)) {
                    WorkbenchSectionTitle("经营摘要")
                    WorkbenchMetricGrid(state.businessMetrics)
                }
                if (state.sections.contains(WorkbenchSection.TODAY_QUEUE)) {
                    WorkbenchSectionTitle(
                        if (state.sections.contains(WorkbenchSection.BUSINESS_SUMMARY)) {
                            "结算与保险优先事项"
                        } else {
                            "今日待办"
                        },
                    )
                    WorkbenchActions(
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
                }
                if (state.sections.contains(WorkbenchSection.ORDER_STATUS)) {
                    WorkbenchSectionTitle("工单状态")
                    WorkbenchMetricGrid(state.metrics)
                }
                WorkbenchSectionTitle("近期工单")
                state.recentOrders.forEach { order -> WorkbenchOrderCard(order) }
            }
        }
        SnackbarHost(hostState = snackbarHostState)
    }
}
