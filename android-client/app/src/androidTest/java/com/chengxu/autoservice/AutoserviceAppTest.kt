package com.chengxu.autoservice

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.requiredWidth
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.assertIsSelected
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertHeightIsAtLeast
import androidx.compose.ui.test.assertWidthIsEqualTo
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.unit.dp
import com.chengxu.autoservice.core.auth.AuthApi
import com.chengxu.autoservice.core.auth.AuthCredentials
import com.chengxu.autoservice.core.auth.AuthFailure
import com.chengxu.autoservice.core.auth.AuthResult
import com.chengxu.autoservice.core.auth.AuthenticationRepository
import com.chengxu.autoservice.core.auth.SessionStore
import com.chengxu.autoservice.core.model.UserRole
import com.chengxu.autoservice.core.network.ConnectionState
import com.chengxu.autoservice.core.network.NetworkMonitor
import com.chengxu.autoservice.core.session.AppSession
import com.chengxu.autoservice.core.session.PermissionSnapshot
import com.chengxu.autoservice.core.designsystem.AutoserviceTheme
import com.chengxu.autoservice.core.designsystem.BrandDialogTestTags
import com.chengxu.autoservice.ui.auth.LoginScreen
import com.chengxu.autoservice.ui.auth.LoginTestTags
import com.chengxu.autoservice.ui.auth.LoginUiState
import com.chengxu.autoservice.ui.workbench.DemoWorkbenchRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import org.junit.Rule
import org.junit.Test

class AutoserviceAppTest {
    @get:Rule
    val composeRule = createComposeRule()

    @Test
    fun unauthenticatedRootShowsCompanyAccountPasswordAndLogin() {
        setApp(storedSession = null)

        composeRule.onNodeWithText("选择企业").assertIsDisplayed()
        composeRule.onNodeWithText("账号").assertIsDisplayed()
        composeRule.onNodeWithText("密码").assertIsDisplayed()
        composeRule.onNodeWithText("进入系统").assertIsDisplayed()
        composeRule.onNodeWithText("鑫齐恒汽车服务中心").assertIsDisplayed()
    }

    @Test
    fun loginShowsTwoSelectableCompanyCardsAndPasswordVisibility() {
        setApp(storedSession = null)

        composeRule.onNodeWithTag(LoginTestTags.COMPANY_TONGDA).assertIsSelected()
            .assertHeightIsAtLeast(48.dp)
        composeRule.onNodeWithTag(LoginTestTags.COMPANY_XINQIHENG).performClick().assertIsSelected()
            .assertHeightIsAtLeast(48.dp)
        composeRule.onNodeWithContentDescription("显示密码").performClick()
        composeRule.onNodeWithContentDescription("隐藏密码").assertIsDisplayed().assertHeightIsAtLeast(48.dp)
    }

    @Test
    fun loginKeepsThePrimaryActionReachableAt360Dp() {
        composeRule.setContent {
            AutoserviceTheme {
                Box(modifier = Modifier.requiredWidth(360.dp)) {
                    LoginScreen(
                        state = LoginUiState(),
                        onCompanySelected = {},
                        onUsernameChanged = {},
                        onPasswordChanged = {},
                        onLogin = {},
                        modifier = Modifier.requiredWidth(360.dp),
                    )
                }
            }
        }

        composeRule.onRoot().assertWidthIsEqualTo(360.dp)
        composeRule.onNodeWithText("进入系统").performScrollTo().assertIsDisplayed()
    }

    @Test
    fun authenticatedRootShowsWorkbenchAndProfileLogout() {
        setApp(storedSession = employeeSession())

        composeRule.onNodeWithText("今日工作").assertIsDisplayed()
        composeRule.onNodeWithText("我的").performClick()
        composeRule.onNodeWithText("退出登录").assertIsDisplayed()
        composeRule.onNodeWithText("退出登录").performClick()
        composeRule.onNodeWithText("确认退出登录").assertIsDisplayed()
        composeRule.onNodeWithTag(BrandDialogTestTags.CANCEL).performClick()
        composeRule.onNodeWithText("退出登录").assertIsDisplayed().performClick()
        composeRule.onNodeWithTag(BrandDialogTestTags.CONFIRM).performClick()
        composeRule.onNodeWithText("进入系统").assertIsDisplayed()
    }

    private fun setApp(storedSession: AppSession?) {
        val authenticationRepository = AuthenticationRepository(
            authApi = FakeAuthApi(),
            sessionStore = FakeSessionStore(storedSession),
        )
        composeRule.setContent {
            AutoserviceApp(
                authenticationRepository = authenticationRepository,
                networkMonitor = FakeNetworkMonitor(),
                workbenchRepository = DemoWorkbenchRepository(),
            )
        }
    }

    private fun employeeSession() = AppSession(
        companyId = "tongda",
        companyName = "通达汽车服务中心",
        username = "worker",
        staffName = "通达员工",
        token = "token-123",
        role = UserRole.EMPLOYEE,
        permissions = PermissionSnapshot.forRole(UserRole.EMPLOYEE),
    )

    private class FakeAuthApi : AuthApi {
        override suspend fun login(credentials: AuthCredentials): AuthResult =
            AuthResult.Failure(AuthFailure.InvalidCredentials)
    }

    private class FakeSessionStore(private var session: AppSession?) : SessionStore {
        override suspend fun read(): AppSession? = session
        override suspend fun write(session: AppSession) { this.session = session }
        override suspend fun clear() { session = null }
    }

    private class FakeNetworkMonitor : NetworkMonitor {
        override val connection: StateFlow<ConnectionState> = MutableStateFlow(ConnectionState.Online)
    }
}
