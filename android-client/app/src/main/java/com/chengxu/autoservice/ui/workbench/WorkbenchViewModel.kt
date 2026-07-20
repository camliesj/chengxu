package com.chengxu.autoservice.ui.workbench

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chengxu.autoservice.core.designsystem.MetricTone
import com.chengxu.autoservice.core.model.AppPermission
import com.chengxu.autoservice.core.model.UserRole
import com.chengxu.autoservice.core.network.ConnectionState
import com.chengxu.autoservice.core.network.NetworkMonitor
import com.chengxu.autoservice.core.session.AppSession
import com.chengxu.autoservice.core.session.MutationGate
import com.chengxu.autoservice.core.session.SessionRepository
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.stateIn

class WorkbenchViewModel(
    private val sessionRepository: SessionRepository,
    private val networkMonitor: NetworkMonitor,
    private val workbenchRepository: WorkbenchRepository,
) : ViewModel() {
    val uiState: StateFlow<WorkbenchUiState> = combine(
        sessionRepository.session.filterNotNull(),
        networkMonitor.connection,
        workbenchRepository.recentOrders,
    ) { session, connection, orders ->
        session.toWorkbenchUiState(connection, orders)
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.Eagerly,
        initialValue = WorkbenchUiState(),
    )
}

private fun AppSession.toWorkbenchUiState(
    connection: ConnectionState,
    orders: List<WorkbenchOrder>,
): WorkbenchUiState = WorkbenchUiState(
    loading = false,
    companyName = companyName,
    staffName = staffName,
    title = if (role == UserRole.ADMINISTRATOR) "管理员工作台" else "今日工作",
    subtitle = if (role == UserRole.ADMINISTRATOR) {
        "关注结算节奏、产值进度与高优先事项。"
    } else {
        "优先处理在修推进、费用核对与保险到期提醒。"
    },
    statusMetrics = workbenchStatusMetrics,
    metrics = if (role == UserRole.ADMINISTRATOR) emptyList() else employeeMetrics,
    businessMetrics = if (role == UserRole.ADMINISTRATOR) adminBusinessMetrics else emptyList(),
    sections = if (role == UserRole.ADMINISTRATOR) {
        listOf(WorkbenchSection.BUSINESS_SUMMARY, WorkbenchSection.TODAY_QUEUE)
    } else {
        listOf(WorkbenchSection.TODAY_QUEUE, WorkbenchSection.ORDER_STATUS)
    },
    quickActions = actionTemplates
        .filter { permissions.allows(it.permission) }
        .map { template ->
            WorkbenchAction(
                label = template.label,
                permission = template.permission,
                decision = MutationGate.evaluate(connection, template.permission, permissions),
            )
        },
    recentOrders = orders,
    connection = connection,
)

private data class ActionTemplate(
    val label: String,
    val permission: AppPermission,
)

private val actionTemplates = listOf(
    ActionTemplate("新增工单", AppPermission.CREATE_ORDER),
    ActionTemplate("更新工单状态", AppPermission.ADVANCE_ORDER_STATUS),
    ActionTemplate("办理结算", AppPermission.SETTLE_ORDER),
)

private val employeeMetrics = listOf(
    WorkbenchMetric("今日接车", "12", "较昨日 +2", MetricTone.PRIMARY),
    WorkbenchMetric("在修车辆", "18", "钣喷 7 / 机修 11", MetricTone.SUCCESS),
    WorkbenchMetric("待交付", "04", "今日需回访 2 台", MetricTone.WARNING),
    WorkbenchMetric("保险到期", "09", "三日内到期", MetricTone.DANGER),
)

private val workbenchStatusMetrics = listOf(
    WorkbenchMetric("新建", "06", "待接单", MetricTone.PRIMARY),
    WorkbenchMetric("在修", "18", "维修看板", MetricTone.SUCCESS),
    WorkbenchMetric("待结算", "05", "费用核对", MetricTone.WARNING),
    WorkbenchMetric("保险到期", "09", "联系车主", MetricTone.DANGER),
)

private val adminBusinessMetrics = listOf(
    WorkbenchMetric("本月产值", "286,400", "较上月 +8.6%", MetricTone.PRIMARY),
    WorkbenchMetric("待结算金额", "42,600", "5 单待处理", MetricTone.WARNING),
    WorkbenchMetric("在修车辆", "18", "负荷平稳", MetricTone.SUCCESS),
    WorkbenchMetric("保险到期", "09", "高优先跟进", MetricTone.DANGER),
)
