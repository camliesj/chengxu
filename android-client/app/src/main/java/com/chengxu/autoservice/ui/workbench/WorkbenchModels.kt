package com.chengxu.autoservice.ui.workbench

import com.chengxu.autoservice.core.designsystem.MetricTone
import com.chengxu.autoservice.core.model.AppPermission
import com.chengxu.autoservice.core.network.ConnectionState
import com.chengxu.autoservice.core.session.MutationDecision

enum class WorkbenchSection {
    TODAY_QUEUE,
    ORDER_STATUS,
    BUSINESS_SUMMARY,
}

data class WorkbenchMetric(
    val label: String,
    val value: String,
    val detail: String,
    val tone: MetricTone,
)

data class WorkbenchOrder(
    val orderNumber: String,
    val plateNumber: String,
    val customerName: String,
    val statusLabel: String,
    val repairSummary: String,
    val amountLabel: String,
)

data class WorkbenchAction(
    val label: String,
    val permission: AppPermission,
    val decision: MutationDecision,
)

data class WorkbenchUiState(
    val loading: Boolean = true,
    val refreshing: Boolean = false,
    val syncMessage: String? = null,
    val showRetry: Boolean = false,
    val companyName: String = "",
    val staffName: String = "",
    val title: String = "",
    val subtitle: String = "",
    val statusMetrics: List<WorkbenchMetric> = emptyList(),
    val metrics: List<WorkbenchMetric> = emptyList(),
    val businessMetrics: List<WorkbenchMetric> = emptyList(),
    val sections: List<WorkbenchSection> = emptyList(),
    val quickActions: List<WorkbenchAction> = emptyList(),
    val recentOrders: List<WorkbenchOrder> = emptyList(),
    val connection: ConnectionState = ConnectionState.Online,
)
