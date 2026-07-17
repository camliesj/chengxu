package com.chengxu.autoservice

import android.content.Intent
import androidx.test.core.app.ActivityScenario
import androidx.test.platform.app.InstrumentationRegistry
import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithText
import com.chengxu.autoservice.core.model.UserRole
import com.chengxu.autoservice.core.network.ConnectionState
import com.chengxu.autoservice.core.network.NetworkMonitor
import com.chengxu.autoservice.core.session.AppSession
import com.chengxu.autoservice.core.session.PermissionSnapshot
import com.chengxu.autoservice.core.session.SessionRepository
import com.chengxu.autoservice.ui.workbench.DemoWorkbenchRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test

class AutoserviceAppTest {
    @get:Rule
    val composeRule = createComposeRule()

    @Test
    fun debugAdminIntentLaunchesAdminWorkbench() {
        val role = resolveDemoRole(Intent().putExtra("demo_role", "admin"), debug = true)
        setApp(role)

        composeRule.onNodeWithText("管理员工作台").assertIsDisplayed()
        composeRule.onNodeWithText("办理结算").assertIsDisplayed()
    }

    @Test
    fun debugAdminIntentIsReadByMainActivity() {
        val intent = Intent(
            InstrumentationRegistry.getInstrumentation().targetContext,
            MainActivity::class.java,
        ).putExtra("demo_role", "admin")

        ActivityScenario.launch<MainActivity>(intent).use { scenario ->
            scenario.onActivity { activity ->
                assertEquals(UserRole.ADMINISTRATOR, activity.activeRoleForTesting)
            }
        }
    }

    @Test
    fun releaseRoleResolutionAndEmployeeAppDoNotExposeRoleSwitch() {
        assertEquals(
            UserRole.EMPLOYEE,
            resolveDemoRole(Intent().putExtra("demo_role", "admin"), debug = false),
        )
        setApp(UserRole.EMPLOYEE)

        composeRule.onAllNodesWithText("切换角色").assertCountEquals(0)
        composeRule.onAllNodesWithText("办理结算").assertCountEquals(0)
    }

    private fun setApp(role: UserRole) {
        composeRule.setContent {
            AutoserviceApp(
                sessionRepository = FakeSessionRepository(role),
                networkMonitor = FakeNetworkMonitor(),
                workbenchRepository = DemoWorkbenchRepository(),
            )
        }
    }

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

    private class FakeNetworkMonitor : NetworkMonitor {
        override val connection: StateFlow<ConnectionState> = MutableStateFlow(ConnectionState.Online)
    }
}
