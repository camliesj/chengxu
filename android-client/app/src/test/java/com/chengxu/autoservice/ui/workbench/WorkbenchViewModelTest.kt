package com.chengxu.autoservice.ui.workbench

import com.chengxu.autoservice.core.model.AppPermission
import com.chengxu.autoservice.core.model.UserRole
import com.chengxu.autoservice.core.network.ConnectionState
import com.chengxu.autoservice.core.network.NetworkMonitor
import com.chengxu.autoservice.core.orders.OrderSyncState
import com.chengxu.autoservice.core.orders.OrdersRepository
import com.chengxu.autoservice.core.orders.OrdersSnapshot
import com.chengxu.autoservice.core.orders.RepairOrder
import com.chengxu.autoservice.core.session.AppSession
import com.chengxu.autoservice.core.session.MutationDecision
import com.chengxu.autoservice.core.session.PermissionSnapshot
import com.chengxu.autoservice.core.session.SessionRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset

@OptIn(ExperimentalCoroutinesApi::class)
class WorkbenchViewModelTest {
    private val dispatcher = UnconfinedTestDispatcher()
    private val clock = Clock.fixed(Instant.parse("2026-07-17T08:00:00Z"), ZoneOffset.UTC)

    @Before
    fun setUp() {
        Dispatchers.setMain(dispatcher)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun loadingCacheMapsToLoadingState() = runTest {
        val viewModel = createViewModel(snapshot = OrdersSnapshot())

        val state = viewModel.uiState.first { it.companyName.isNotBlank() }

        assertTrue(state.loading)
    }

    @Test
    fun employeeStateUsesRealOrdersAndOmitsSettlementAction() = runTest {
        val viewModel = createViewModel(
            role = UserRole.EMPLOYEE,
            snapshot = OrdersSnapshot(
                orders = listOf(order("today", status = "在修中"), order("done", status = "已完工")),
                syncState = OrderSyncState.Ready,
            ),
        )

        val state = viewModel.uiState.first { !it.loading }

        assertEquals("今日工作", state.title)
        assertEquals("2", state.metrics.single { it.label == "今日接车" }.value)
        assertEquals("1", state.metrics.single { it.label == "在修车辆" }.value)
        assertEquals(listOf("today", "done"), state.recentOrders.map { it.orderNumber })
        assertFalse(state.quickActions.any { it.permission == AppPermission.SETTLE_ORDER })
    }

    @Test
    fun administratorStateContainsRealBusinessSummaryAndSettlement() = runTest {
        val viewModel = createViewModel(
            role = UserRole.ADMINISTRATOR,
            snapshot = OrdersSnapshot(
                orders = listOf(order("pending", status = "待结算", amountCents = 50_025)),
                syncState = OrderSyncState.Ready,
            ),
        )

        val state = viewModel.uiState.first { !it.loading }

        assertEquals("管理员工作台", state.title)
        assertEquals("¥500.25", state.businessMetrics.single { it.label == "本月产值" }.value)
        assertTrue(state.sections.contains(WorkbenchSection.BUSINESS_SUMMARY))
        assertTrue(state.quickActions.any { it.permission == AppPermission.SETTLE_ORDER })
    }

    @Test
    fun staleSnapshotMapsExactMessageAndRetryFlagWhileKeepingRows() = runTest {
        val repository = FakeOrdersRepository(
            OrdersSnapshot(
                orders = listOf(order("cached")),
                syncState = OrderSyncState.Stale("网络异常，当前数据可能不是最新"),
            ),
        )
        val viewModel = createViewModel(ordersRepository = repository)

        val state = viewModel.uiState.first { !it.loading }

        assertEquals("网络异常，当前数据可能不是最新", state.syncMessage)
        assertTrue(state.showRetry)
        assertEquals(listOf("cached"), state.recentOrders.map { it.orderNumber })
    }

    @Test
    fun refreshingSnapshotKeepsRowsAndExposesProgress() = runTest {
        val viewModel = createViewModel(
            snapshot = OrdersSnapshot(
                orders = listOf(order("cached")),
                syncState = OrderSyncState.Refreshing,
            ),
        )

        val state = viewModel.uiState.first { !it.loading }

        assertTrue(state.refreshing)
        assertEquals(listOf("cached"), state.recentOrders.map { it.orderNumber })
    }

    @Test
    fun refreshDelegatesToOrdersRepositoryOnce() = runTest {
        val repository = FakeOrdersRepository(OrdersSnapshot(syncState = OrderSyncState.Ready))
        val viewModel = createViewModel(ordersRepository = repository)

        viewModel.refresh()
        advanceUntilIdle()

        assertEquals(1, repository.refreshCount)
    }

    @Test
    fun offlineActionsExposeTheSharedReadOnlyDenial() = runTest {
        val viewModel = createViewModel(
            role = UserRole.ADMINISTRATOR,
            connection = ConnectionState.Offline,
            snapshot = OrdersSnapshot(syncState = OrderSyncState.Ready),
        )

        val state = viewModel.uiState.first { !it.loading }

        assertTrue(state.quickActions.isNotEmpty())
        assertTrue(state.quickActions.all { it.decision is MutationDecision.Denied })
        assertTrue(
            state.quickActions.all {
                (it.decision as MutationDecision.Denied).reason == "网络不可用，当前为只读模式"
            },
        )
    }

    private fun createViewModel(
        role: UserRole = UserRole.EMPLOYEE,
        connection: ConnectionState = ConnectionState.Online,
        snapshot: OrdersSnapshot = OrdersSnapshot(syncState = OrderSyncState.Ready),
        ordersRepository: FakeOrdersRepository = FakeOrdersRepository(snapshot),
    ): WorkbenchViewModel = WorkbenchViewModel(
        sessionRepository = FakeSessionRepository(role),
        networkMonitor = FakeNetworkMonitor(connection),
        ordersRepository = ordersRepository,
        clock = clock,
    )

    private fun order(
        id: String,
        status: String = "在修中",
        amountCents: Long = 0,
    ) = RepairOrder(
        id = id,
        companyId = "tongda",
        date = "2026-07-17",
        dateSortKey = "2026-07-17",
        time = if (id == "today") "10:00" else "09:00",
        plate = "蒙A12345",
        customer = "张先生",
        car = "大众帕萨特",
        type = "常规保养",
        status = status,
        amountCents = amountCents,
        record = "更换机油与滤芯",
        insuranceExpiry = "",
        delivery = "",
    )

    private class FakeOrdersRepository(initial: OrdersSnapshot) : OrdersRepository {
        override val snapshot: StateFlow<OrdersSnapshot> = MutableStateFlow(initial)
        var refreshCount = 0

        override suspend fun refresh() {
            refreshCount += 1
        }
    }

    private class FakeSessionRepository(role: UserRole) : SessionRepository {
        override val session: StateFlow<AppSession?> = MutableStateFlow(
            AppSession(
                companyId = "tongda",
                companyName = "通达汽车服务中心",
                username = "worker",
                staffName = "张工",
                token = "token",
                role = role,
                permissions = PermissionSnapshot.forRole(role),
            ),
        )
    }

    private class FakeNetworkMonitor(connection: ConnectionState) : NetworkMonitor {
        override val connection: StateFlow<ConnectionState> = MutableStateFlow(connection)
    }
}
