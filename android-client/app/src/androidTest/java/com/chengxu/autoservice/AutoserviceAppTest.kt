package com.chengxu.autoservice

import androidx.compose.foundation.layout.requiredSize
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.assertHeightIsEqualTo
import androidx.compose.ui.test.assertIsSelected
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertHeightIsAtLeast
import androidx.compose.ui.test.assertWidthIsEqualTo
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.unit.dp
import com.chengxu.autoservice.core.auth.AuthApi
import com.chengxu.autoservice.core.auth.AuthCredentials
import com.chengxu.autoservice.core.auth.AuthFailure
import com.chengxu.autoservice.core.auth.AuthResult
import com.chengxu.autoservice.core.auth.AuthenticatedDataCleaner
import com.chengxu.autoservice.core.auth.AuthenticationRepository
import com.chengxu.autoservice.core.auth.SessionStore
import com.chengxu.autoservice.core.model.UserRole
import com.chengxu.autoservice.core.network.ConnectionState
import com.chengxu.autoservice.core.network.NetworkMonitor
import com.chengxu.autoservice.core.orders.OrderSyncState
import com.chengxu.autoservice.core.orders.OrdersRepository
import com.chengxu.autoservice.core.orders.OrdersSnapshot
import com.chengxu.autoservice.core.orders.RepairOrder
import com.chengxu.autoservice.core.session.AppSession
import com.chengxu.autoservice.core.session.PermissionSnapshot
import com.chengxu.autoservice.core.designsystem.AutoserviceTheme
import com.chengxu.autoservice.core.designsystem.BrandDialogTestTags
import com.chengxu.autoservice.ui.auth.LoginScreen
import com.chengxu.autoservice.ui.auth.LoginTestTags
import com.chengxu.autoservice.ui.auth.LoginUiState
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
    fun loginShowsThePrimaryActionWithoutScrollingAt360By800Dp() {
        composeRule.setContent {
            AutoserviceTheme {
                LoginScreen(
                    state = LoginUiState(),
                    onCompanySelected = {},
                    onUsernameChanged = {},
                    onPasswordChanged = {},
                    onLogin = {},
                    modifier = Modifier.requiredSize(width = 360.dp, height = 800.dp),
                )
            }
        }

        composeRule.onNodeWithTag(LoginTestTags.ROOT)
            .assertWidthIsEqualTo(360.dp)
            .assertHeightIsEqualTo(800.dp)
        composeRule.onNodeWithTag(LoginTestTags.HERO).assertHeightIsEqualTo(200.dp)
        composeRule.onNodeWithTag(LoginTestTags.COMPANY_TONGDA).assertHeightIsEqualTo(56.dp)
        composeRule.onNodeWithTag(LoginTestTags.COMPANY_XINQIHENG).assertHeightIsEqualTo(56.dp)
        composeRule.onNodeWithTag(LoginTestTags.PRIMARY_ACTION)
            .assertIsDisplayed()
            .assertHeightIsAtLeast(48.dp)
    }

    @Test
    fun authenticatedRootShowsWorkbenchAndProfileLogout() {
        setApp(storedSession = employeeSession())

        composeRule.onNodeWithText("今日工作").assertIsDisplayed()
        composeRule.onNodeWithText("工单").performClick()
        composeRule.onNodeWithText("RO-APP-1").assertIsDisplayed()
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
            authenticatedDataCleaner = AuthenticatedDataCleaner { },
        )
        composeRule.setContent {
            AutoserviceApp(
                authenticationRepository = authenticationRepository,
                networkMonitor = FakeNetworkMonitor(),
                ordersRepository = FakeOrdersRepository(),
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

    private class FakeOrdersRepository : OrdersRepository {
        override val snapshot: StateFlow<OrdersSnapshot> =
            MutableStateFlow(
                OrdersSnapshot(
                    orders = listOf(
                        RepairOrder(
                            id = "RO-APP-1",
                            companyId = "tongda",
                            date = "2026-07-20",
                            dateSortKey = "2026-07-20",
                            time = "09:30",
                            plate = "蒙A12345",
                            customer = "张先生",
                            car = "大众帕萨特",
                            type = "常规保养",
                            status = "在修中",
                            amountCents = 50_000,
                            record = "更换机油与滤芯",
                            insuranceExpiry = "2026-12-31",
                            delivery = "2026-07-21",
                        ),
                    ),
                    syncState = OrderSyncState.Ready,
                ),
            )

        override suspend fun refresh() = Unit
    }
}
