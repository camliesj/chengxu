package com.chengxu.autoservice.navigation

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.navigation3.runtime.NavEntry
import androidx.navigation3.ui.NavDisplay
import com.chengxu.autoservice.core.session.AppSession
import com.chengxu.autoservice.ui.create.CreateOrderField
import com.chengxu.autoservice.ui.create.CreateOrderScreen
import com.chengxu.autoservice.ui.create.CreateOrderUiState
import com.chengxu.autoservice.ui.edit.EditOrderScreen
import com.chengxu.autoservice.ui.edit.EditOrderUiState
import com.chengxu.autoservice.ui.edit.EditOrderField
import com.chengxu.autoservice.ui.profile.ProfileScreen
import com.chengxu.autoservice.ui.orders.OrderDetailScreen
import com.chengxu.autoservice.ui.orders.OrderDetailUiState
import com.chengxu.autoservice.ui.settlement.SettlementScreen
import com.chengxu.autoservice.ui.settlement.SettlementUiState
import com.chengxu.autoservice.ui.settlement.SelectedReceipt
import com.chengxu.autoservice.ui.orders.OrderStatusFilter
import com.chengxu.autoservice.ui.orders.OrdersScreen
import com.chengxu.autoservice.ui.orders.OrdersUiState
import com.chengxu.autoservice.ui.records.HistoryRecordsScreen
import com.chengxu.autoservice.ui.records.HistoryRecordsUiState
import com.chengxu.autoservice.ui.records.HistoryTimeFilter
import com.chengxu.autoservice.ui.records.CustomerVehiclesScreen
import com.chengxu.autoservice.ui.records.CustomerVehiclesUiState
import com.chengxu.autoservice.ui.records.CustomerVehicleDetailScreen
import com.chengxu.autoservice.ui.records.InsurancePoliciesScreen
import com.chengxu.autoservice.ui.records.InsurancePoliciesUiState
import com.chengxu.autoservice.ui.records.InsurancePolicyDetailScreen
import com.chengxu.autoservice.core.orders.InsurancePolicyRecord
import com.chengxu.autoservice.core.designsystem.BrandSegmentedFilter
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.Arrangement
import com.chengxu.autoservice.core.designsystem.AutoserviceSpacing
import com.chengxu.autoservice.ui.status.OrderStatusConfirmScreen
import com.chengxu.autoservice.ui.status.OrderStatusUiState
import com.chengxu.autoservice.core.orders.model.BusinessCapability
import com.chengxu.autoservice.core.orders.model.OrderStatus
import com.chengxu.autoservice.core.orders.model.allowedOrderTransition
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
    historyRecordsState: HistoryRecordsUiState = HistoryRecordsUiState(loading = false),
    onHistoryRecordsQueryChange: (String) -> Unit = {},
    onHistoryRecordsTimeFilterChange: (HistoryTimeFilter) -> Unit = {},
    onHistoryRecordsClearFilters: () -> Unit = {},
    onHistoryRecordsRefresh: () -> Unit = {},
    onHistoryRecordsLoadMore: () -> Unit = {},
    customerVehiclesState: CustomerVehiclesUiState = CustomerVehiclesUiState(),
    onCustomerVehiclesQueryChange: (String) -> Unit = {},
    insurancePoliciesState: InsurancePoliciesUiState = InsurancePoliciesUiState(),
    onInsurancePoliciesQueryChange: (String) -> Unit = {},
    onInsurancePoliciesCreate: () -> Unit = {},
    onInsurancePoliciesDraftChange: ((InsurancePolicyRecord) -> InsurancePolicyRecord) -> Unit = {},
    onInsurancePoliciesSave: () -> Unit = {},
    onInsurancePoliciesDismissEditor: () -> Unit = {},
    onInsurancePoliciesDelete: (InsurancePolicyRecord) -> Unit = {},
    onInsurancePoliciesConfirmDelete: () -> Unit = {},
    onInsurancePoliciesDismissDelete: () -> Unit = {},
    onInsurancePoliciesEdit: (InsurancePolicyRecord) -> Unit = {},
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
    detailState: OrderDetailUiState = OrderDetailUiState(),
    onEditOrder: (String) -> Unit = {},
    editState: EditOrderUiState = EditOrderUiState(),
    onEditUpdate: (EditOrderField, String) -> Unit = { _, _ -> },
    onEditNext: () -> Unit = {},
    onEditBack: () -> Unit = {},
    onEditSubmit: () -> Unit = {},
    onEditConfirm: () -> Unit = {},
    onEditSaveDraft: () -> Unit = {},
    onEditReturn: () -> Unit = {},
    onEditRebase: () -> Unit = {},
    statusState: OrderStatusUiState = OrderStatusUiState(),
    onStatusConfirm: () -> Unit = {},
    onStatusConfirmUnknown: () -> Unit = {},
    settlementState: SettlementUiState = SettlementUiState(),
    onSettlementReceipt: (SelectedReceipt) -> Unit = {},
    onSettlementPayment: (String) -> Unit = {},
    onSettlementDate: (String) -> Unit = {},
    onSettlementTime: (String) -> Unit = {},
    onSettlementRemark: (String) -> Unit = {},
    onSettlementSubmit: () -> Unit = {},
    onSettlementConfirmReverse: () -> Unit = {},
    onSettlementDismissReverse: () -> Unit = {},
    profileSession: AppSession? = null,
    onLogout: () -> Unit = {},
    isOffline: Boolean = false,
) {
    // NavDisplay retains NavEntry content between recompositions. Keep the mutable
    // order inputs in updated state so a filter click redraws the active entry.
    val currentOrdersState by rememberUpdatedState(ordersState)
    val currentOrdersQueryChange by rememberUpdatedState(onOrdersQueryChange)
    val currentOrdersFilterSelected by rememberUpdatedState(onOrdersFilterSelected)
    val currentOrdersClearFilters by rememberUpdatedState(onOrdersClearFilters)
    val currentOrdersRefresh by rememberUpdatedState(onOrdersRefresh)
    val currentHistoryRecordsState by rememberUpdatedState(historyRecordsState)
    val currentHistoryRecordsQueryChange by rememberUpdatedState(onHistoryRecordsQueryChange)
    val currentHistoryRecordsTimeFilterChange by rememberUpdatedState(onHistoryRecordsTimeFilterChange)
    val currentHistoryRecordsClearFilters by rememberUpdatedState(onHistoryRecordsClearFilters)
    val currentHistoryRecordsRefresh by rememberUpdatedState(onHistoryRecordsRefresh)
    val currentHistoryRecordsLoadMore by rememberUpdatedState(onHistoryRecordsLoadMore)
    val currentCustomerVehiclesState by rememberUpdatedState(customerVehiclesState)
    val currentCustomerVehiclesQueryChange by rememberUpdatedState(onCustomerVehiclesQueryChange)
    val currentInsurancePoliciesState by rememberUpdatedState(insurancePoliciesState)
    val currentInsurancePoliciesQueryChange by rememberUpdatedState(onInsurancePoliciesQueryChange)
    val currentInsurancePoliciesCreate by rememberUpdatedState(onInsurancePoliciesCreate)
    val currentInsurancePoliciesDraftChange by rememberUpdatedState(onInsurancePoliciesDraftChange)
    val currentInsurancePoliciesSave by rememberUpdatedState(onInsurancePoliciesSave)
    val currentInsurancePoliciesDismissEditor by rememberUpdatedState(onInsurancePoliciesDismissEditor)
    val currentInsurancePoliciesDelete by rememberUpdatedState(onInsurancePoliciesDelete)
    val currentInsurancePoliciesConfirmDelete by rememberUpdatedState(onInsurancePoliciesConfirmDelete)
    val currentInsurancePoliciesDismissDelete by rememberUpdatedState(onInsurancePoliciesDismissDelete)
    val currentInsurancePoliciesEdit by rememberUpdatedState(onInsurancePoliciesEdit)
    val currentCreateState by rememberUpdatedState(createState)
    val currentDetailState by rememberUpdatedState(detailState)
    val currentEditState by rememberUpdatedState(editState)
    val currentStatusState by rememberUpdatedState(statusState)
    val currentSettlementState by rememberUpdatedState(settlementState)
    val currentIsOffline by rememberUpdatedState(isOffline)

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
                        state = currentOrdersState,
                        isOffline = currentIsOffline,
                        onQueryChange = currentOrdersQueryChange,
                        onFilterSelected = currentOrdersFilterSelected,
                        onClearFilters = currentOrdersClearFilters,
                        onRefresh = currentOrdersRefresh,
                        onOrderSelected = { orderId ->
                            navigationState.push(AppRoute.OrderDetail(orderId))
                        },
                    )
                    AppRoute.CreateOrder -> CreateOrderScreen(
                        state = currentCreateState,
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
                    AppRoute.Records -> RecordsTabs(
                        historyState = currentHistoryRecordsState,
                        vehicleState = currentCustomerVehiclesState,
                        insuranceState = currentInsurancePoliciesState,
                        isOffline = currentIsOffline,
                        onHistoryQueryChange = currentHistoryRecordsQueryChange,
                        onHistoryTimeFilterChange = currentHistoryRecordsTimeFilterChange,
                        onHistoryClearFilters = currentHistoryRecordsClearFilters,
                        onHistoryRefresh = currentHistoryRecordsRefresh,
                        onHistoryLoadMore = currentHistoryRecordsLoadMore,
                        onVehicleQueryChange = currentCustomerVehiclesQueryChange,
                        onInsuranceQueryChange = currentInsurancePoliciesQueryChange,
                        onInsuranceCreate = currentInsurancePoliciesCreate,
                        onInsuranceDraftChange = currentInsurancePoliciesDraftChange,
                        onInsuranceSave = currentInsurancePoliciesSave,
                        onInsuranceDismissEditor = currentInsurancePoliciesDismissEditor,
                        onInsuranceDelete = currentInsurancePoliciesDelete,
                        onInsuranceConfirmDelete = currentInsurancePoliciesConfirmDelete,
                        onInsuranceDismissDelete = currentInsurancePoliciesDismissDelete,
                        onOrderSelected = { navigationState.push(AppRoute.HistoryOrderDetail(it)) },
                        onVehicleSelected = { navigationState.push(AppRoute.CustomerVehicleDetail(it)) },
                        onInsuranceSelected = { navigationState.push(AppRoute.InsurancePolicyDetail(it)) },
                    )
                    AppRoute.Profile -> profileSession?.let {
                        ProfileScreen(session = it, offline = isOffline, onLogout = onLogout)
                    } ?: ShellPlaceholder(title = RootTab.PROFILE.label)
                    is AppRoute.OrderDetail -> OrderDetailScreen(
                        order = currentOrdersState.allOrders.firstOrNull { order -> order.id == entry.orderId },
                        onBack = navigationState::pop,
                        canEdit = currentDetailState.canEdit,
                        onEdit = { onEditOrder(entry.orderId) },
                        statusTargets = availableStatusTargets(currentDetailState, profileSession),
                        onChangeStatus = { target -> navigationState.push(AppRoute.ChangeOrderStatus(entry.orderId, target.wireValue)) },
                        canSettle = BusinessCapability.SETTLE_ORDER in currentDetailState.capabilities,
                        onSettle = { navigationState.push(AppRoute.Settlement(entry.orderId)) },
                        canReverse = BusinessCapability.REVERSE_SETTLEMENT in currentDetailState.capabilities,
                        onReverse = { navigationState.push(AppRoute.Settlement(entry.orderId, reversing = true)) },
                    )
                    is AppRoute.HistoryOrderDetail -> OrderDetailScreen(
                        order = historyRecordsState.allOrders.firstOrNull { order -> order.id == entry.orderId },
                        onBack = navigationState::pop,
                        readOnly = true,
                        canReverse = BusinessCapability.REVERSE_SETTLEMENT in currentDetailState.capabilities,
                        onReverse = { navigationState.push(AppRoute.Settlement(entry.orderId, reversing = true)) },
                    )
                    is AppRoute.CustomerVehicleDetail -> CustomerVehicleDetailScreen(
                        record = customerVehiclesState.records.firstOrNull { it.id == entry.recordId },
                        onBack = navigationState::pop,
                    )
                    is AppRoute.InsurancePolicyDetail -> InsurancePolicyDetailScreen(
                        record = currentInsurancePoliciesState.records.firstOrNull { it.id == entry.recordId },
                        canManage = currentInsurancePoliciesState.canManage,
                        submitDisabled = currentInsurancePoliciesState.submitDisabled,
                        onEdit = {
                            currentInsurancePoliciesState.records.firstOrNull { it.id == entry.recordId }?.let(currentInsurancePoliciesEdit)
                            navigationState.pop()
                        },
                        onDelete = {
                            currentInsurancePoliciesState.records.firstOrNull { it.id == entry.recordId }?.let(currentInsurancePoliciesDelete)
                            navigationState.pop()
                        },
                        onBack = navigationState::pop,
                    )
                    is AppRoute.EditOrder -> EditOrderScreen(
                        state = currentEditState,
                        onUpdate = onEditUpdate,
                        onNext = onEditNext,
                        onBack = onEditBack,
                        onSubmit = onEditSubmit,
                        onConfirm = onEditConfirm,
                        onSaveDraft = onEditSaveDraft,
                        onReturn = onEditReturn,
                        onRebase = onEditRebase,
                    )
                    is AppRoute.ChangeOrderStatus -> OrderStatusConfirmScreen(
                        state = currentStatusState,
                        onBack = navigationState::pop,
                        onConfirm = onStatusConfirm,
                        onConfirmUnknown = onStatusConfirmUnknown,
                    )
                    is AppRoute.Settlement -> SettlementScreen(
                        state = currentSettlementState,
                        onBack = navigationState::pop,
                        onReceipt = onSettlementReceipt,
                        onPayment = onSettlementPayment,
                        onDate = onSettlementDate,
                        onTime = onSettlementTime,
                        onRemark = onSettlementRemark,
                        onSubmit = onSettlementSubmit,
                        onConfirmReverse = onSettlementConfirmReverse,
                        onDismissReverse = onSettlementDismissReverse,
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
private fun RecordsTabs(
    historyState: HistoryRecordsUiState, vehicleState: CustomerVehiclesUiState, insuranceState: InsurancePoliciesUiState, isOffline: Boolean,
    onHistoryQueryChange: (String) -> Unit, onHistoryTimeFilterChange: (HistoryTimeFilter) -> Unit,
    onHistoryClearFilters: () -> Unit, onHistoryRefresh: () -> Unit, onHistoryLoadMore: () -> Unit,
    onVehicleQueryChange: (String) -> Unit, onInsuranceQueryChange: (String) -> Unit, onInsuranceCreate: () -> Unit,
    onInsuranceDraftChange: ((InsurancePolicyRecord) -> InsurancePolicyRecord) -> Unit, onInsuranceSave: () -> Unit,
    onInsuranceDismissEditor: () -> Unit, onInsuranceDelete: (InsurancePolicyRecord) -> Unit,
    onInsuranceConfirmDelete: () -> Unit, onInsuranceDismissDelete: () -> Unit,
    onOrderSelected: (String) -> Unit, onVehicleSelected: (String) -> Unit, onInsuranceSelected: (String) -> Unit,
) {
    var selectedTab by rememberSaveable { mutableIntStateOf(0) }
    Column(Modifier.fillMaxSize()) {
        Text("档案", modifier = Modifier.padding(horizontal = AutoserviceSpacing.Lg, vertical = AutoserviceSpacing.Md), style = MaterialTheme.typography.headlineSmall)
        Row(Modifier.fillMaxWidth().padding(horizontal = AutoserviceSpacing.Lg), horizontalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Sm)) {
            BrandSegmentedFilter("维修历史", selectedTab == 0, { selectedTab = 0 })
            BrandSegmentedFilter("客户车辆", selectedTab == 1, { selectedTab = 1 })
            BrandSegmentedFilter("保险档案", selectedTab == 2, { selectedTab = 2 })
        }
        if (selectedTab == 0) HistoryRecordsScreen(historyState, isOffline, onHistoryQueryChange, onHistoryTimeFilterChange, onHistoryClearFilters, onHistoryRefresh, onHistoryLoadMore, onOrderSelected, showTitle = false, modifier = Modifier.weight(1f))
        else if (selectedTab == 1) CustomerVehiclesScreen(vehicleState, onVehicleQueryChange, onVehicleSelected, Modifier.weight(1f))
        else InsurancePoliciesScreen(insuranceState, onInsuranceQueryChange, onInsuranceCreate, onInsuranceSelected, onInsuranceDraftChange, onInsuranceSave, onInsuranceDismissEditor, onInsuranceConfirmDelete, onInsuranceDismissDelete, Modifier.weight(1f))
    }
}

private fun availableStatusTargets(detailState: OrderDetailUiState, session: AppSession?): List<OrderStatus> {
    val detail = detailState.detail ?: return emptyList()
    val role = session?.role ?: return emptyList()
    if (BusinessCapability.ADVANCE_ORDER_STATUS !in detailState.capabilities) return emptyList()
    val current = OrderStatus.fromWire(detail.summary.status) ?: return emptyList()
    return OrderStatus.entries.filter { target -> allowedOrderTransition(role, current, target) }
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
