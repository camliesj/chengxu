package com.chengxu.autoservice.ui.workbench

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chengxu.autoservice.core.model.AppPermission
import com.chengxu.autoservice.core.model.UserRole
import com.chengxu.autoservice.core.network.ConnectionState
import com.chengxu.autoservice.core.network.NetworkMonitor
import com.chengxu.autoservice.core.orders.OrderSyncState
import com.chengxu.autoservice.core.orders.OrdersRepository
import com.chengxu.autoservice.core.orders.OrdersSnapshot
import com.chengxu.autoservice.core.session.AppSession
import com.chengxu.autoservice.core.session.MutationGate
import com.chengxu.autoservice.core.session.SessionRepository
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.time.Clock
import java.time.LocalDate

class WorkbenchViewModel(
    private val sessionRepository: SessionRepository,
    private val networkMonitor: NetworkMonitor,
    private val ordersRepository: OrdersRepository,
    private val clock: Clock = Clock.systemDefaultZone(),
) : ViewModel() {
    val uiState: StateFlow<WorkbenchUiState> = combine(
        sessionRepository.session.filterNotNull(),
        networkMonitor.connection,
        ordersRepository.snapshot,
    ) { session, connection, snapshot ->
        session.toWorkbenchUiState(connection, snapshot, LocalDate.now(clock))
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.Eagerly,
        initialValue = WorkbenchUiState(),
    )

    fun refresh() {
        viewModelScope.launch { ordersRepository.refresh() }
    }
}

private fun AppSession.toWorkbenchUiState(
    connection: ConnectionState,
    snapshot: OrdersSnapshot,
    today: LocalDate,
): WorkbenchUiState {
    val isAdministrator = role == UserRole.ADMINISTRATOR
    val insuranceWindow = if (isAdministrator) 7L else 3L
    return WorkbenchUiState(
        loading = snapshot.syncState == OrderSyncState.LoadingCache,
        refreshing = snapshot.syncState == OrderSyncState.Refreshing,
        syncMessage = (snapshot.syncState as? OrderSyncState.Stale)?.message,
        showRetry = snapshot.syncState is OrderSyncState.Stale,
        companyName = companyName,
        staffName = staffName,
        title = if (isAdministrator) "管理员工作台" else "今日工作",
        subtitle = if (isAdministrator) {
            "关注结算节奏、产值进度与高优先事项。"
        } else {
            "优先处理在修推进、费用核对与保险到期提醒。"
        },
        statusMetrics = buildStatusMetrics(snapshot.orders, today, insuranceWindow),
        metrics = if (isAdministrator) emptyList() else buildEmployeeMetrics(snapshot.orders, today),
        businessMetrics = if (isAdministrator) buildAdministratorMetrics(snapshot.orders, today) else emptyList(),
        sections = if (isAdministrator) {
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
        recentOrders = mapRecentOrders(snapshot.orders),
        connection = connection,
    )
}

private data class ActionTemplate(
    val label: String,
    val permission: AppPermission,
)

private val actionTemplates = listOf(
    ActionTemplate("新增工单", AppPermission.CREATE_ORDER),
    ActionTemplate("更新工单状态", AppPermission.ADVANCE_ORDER_STATUS),
    ActionTemplate("办理结算", AppPermission.SETTLE_ORDER),
)
