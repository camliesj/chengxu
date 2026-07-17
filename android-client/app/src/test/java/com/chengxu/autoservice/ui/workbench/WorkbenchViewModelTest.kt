package com.chengxu.autoservice.ui.workbench

import com.chengxu.autoservice.core.model.AppPermission
import com.chengxu.autoservice.core.model.UserRole
import com.chengxu.autoservice.core.network.ConnectionState
import com.chengxu.autoservice.core.network.NetworkMonitor
import com.chengxu.autoservice.core.session.AppSession
import com.chengxu.autoservice.core.session.PermissionSnapshot
import com.chengxu.autoservice.core.session.SessionRepository
import com.chengxu.autoservice.core.session.MutationDecision
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class WorkbenchViewModelTest {
    private val dispatcher = UnconfinedTestDispatcher()

    @Before
    fun setUp() {
        Dispatchers.setMain(dispatcher)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun employeeStateOmitsSettlementAction() = runTest {
        val viewModel = createViewModel(UserRole.EMPLOYEE, ConnectionState.Online)

        val state = viewModel.uiState.first { !it.loading }

        assertEquals("今日工作", state.title)
        assertFalse(state.quickActions.any { it.permission == AppPermission.SETTLE_ORDER })
    }

    @Test
    fun administratorStateContainsBusinessSummaryAndSettlement() = runTest {
        val viewModel = createViewModel(UserRole.ADMINISTRATOR, ConnectionState.Online)

        val state = viewModel.uiState.first { !it.loading }

        assertEquals("管理员工作台", state.title)
        assertTrue(state.sections.contains(WorkbenchSection.BUSINESS_SUMMARY))
        assertTrue(state.quickActions.any { it.permission == AppPermission.SETTLE_ORDER })
    }

    @Test
    fun offlineActionsExposeTheSharedReadOnlyDenial() = runTest {
        val viewModel = createViewModel(UserRole.ADMINISTRATOR, ConnectionState.Offline)

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
        role: UserRole,
        connection: ConnectionState,
    ): WorkbenchViewModel = WorkbenchViewModel(
        sessionRepository = FakeSessionRepository(role),
        networkMonitor = FakeNetworkMonitor(connection),
        workbenchRepository = DemoWorkbenchRepository(),
    )

    private class FakeSessionRepository(role: UserRole) : SessionRepository {
        override val session: StateFlow<AppSession> = MutableStateFlow(
            AppSession(
                companyName = "通达汽车服务中心",
                staffName = "张工",
                role = role,
                permissions = PermissionSnapshot.forRole(role),
            ),
        )
    }

    private class FakeNetworkMonitor(connection: ConnectionState) : NetworkMonitor {
        override val connection: StateFlow<ConnectionState> = MutableStateFlow(connection)
    }
}
