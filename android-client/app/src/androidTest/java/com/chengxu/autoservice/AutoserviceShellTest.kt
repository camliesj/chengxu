package com.chengxu.autoservice

import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.assertHeightIsAtLeast
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onAllNodesWithTag
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.unit.dp
import com.chengxu.autoservice.core.designsystem.AutoserviceTheme
import com.chengxu.autoservice.core.model.AppPermission
import com.chengxu.autoservice.core.network.ConnectionState
import com.chengxu.autoservice.core.session.MutationDecision
import com.chengxu.autoservice.ui.shell.AutoserviceShell
import com.chengxu.autoservice.ui.orders.OrderDisplayModel
import com.chengxu.autoservice.ui.orders.OrderStatusTone
import com.chengxu.autoservice.ui.orders.OrdersTestTags
import com.chengxu.autoservice.ui.orders.OrdersUiState
import com.chengxu.autoservice.ui.workbench.WorkbenchAction
import com.chengxu.autoservice.ui.workbench.WorkbenchOrder
import com.chengxu.autoservice.ui.workbench.WorkbenchSection
import com.chengxu.autoservice.ui.workbench.WorkbenchUiState
import com.chengxu.autoservice.navigation.RootTab
import com.chengxu.autoservice.navigation.AppNavigationState
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test

class AutoserviceShellTest {
    @get:Rule
    val composeRule = createComposeRule()

    @Test
    fun centerCreateTabIsThirdAndDisabledOffline() {
        launchShell(connection = ConnectionState.Offline)

        assertEquals(listOf("工作台", "工单", "新增", "档案", "我的"), RootTab.entries.map { it.label })
        composeRule.onAllNodesWithTag("root-tab").assertCountEquals(5)
        composeRule.onNodeWithText("新增").assertIsNotEnabled().assertHeightIsAtLeast(48.dp)
        composeRule.onNodeWithText("网络不可用，当前为只读模式").assertIsDisplayed()
    }

    @Test
    fun ordersAndWorkbenchOpenTheSameDetailWithIndependentStacks() {
        val navigationState = AppNavigationState()
        launchShell(
            connection = ConnectionState.Online,
            navigationState = navigationState,
            ordersState = ordersState(),
            workbenchState = workbenchState(),
        )

        composeRule.onAllNodesWithTag("root-tab").assertCountEquals(5)
        composeRule.onNodeWithText("工单").performClick()
        composeRule.onNodeWithTag("${OrdersTestTags.ORDER_CARD_PREFIX}RO-1").performClick()
        composeRule.onNodeWithText("工单详情").assertIsDisplayed()

        composeRule.onNodeWithText("工作台").performClick()
        composeRule.onNodeWithText("蒙A12345 · 张先生").performClick()
        composeRule.onNodeWithText("工单详情").assertIsDisplayed()

        composeRule.onNodeWithText("工单").performClick()
        composeRule.onNodeWithText("工单详情").assertIsDisplayed()
        composeRule.onNodeWithContentDescription("返回").performClick()
        composeRule.onNodeWithText("共 1 单").assertIsDisplayed()
    }

    @Test
    fun allowedCreateWorkbenchActionNavigatesToCreateStage() {
        composeRule.setContent {
            AutoserviceTheme {
                AutoserviceShell(
                    connection = ConnectionState.Online,
                    workbenchState = WorkbenchUiState(
                        loading = false,
                        companyName = "通达汽车服务中心",
                        staffName = "张工",
                        title = "今日工作",
                        sections = listOf(WorkbenchSection.TODAY_QUEUE),
                        quickActions = listOf(
                            WorkbenchAction(
                                label = "新增工单",
                                permission = AppPermission.CREATE_ORDER,
                                decision = MutationDecision.Allowed,
                            ),
                        ),
                    ),
                )
            }
        }

        composeRule.onNodeWithText("新增工单").performClick()
        composeRule.onNodeWithText("新增工单即将接入").assertIsDisplayed()
    }

    private fun launchShell(
        connection: ConnectionState,
        navigationState: AppNavigationState = AppNavigationState(),
        ordersState: OrdersUiState = OrdersUiState(loading = false),
        workbenchState: WorkbenchUiState? = null,
    ) {
        composeRule.setContent {
            AutoserviceTheme {
                AutoserviceShell(
                    connection = connection,
                    navigationState = navigationState,
                    ordersState = ordersState,
                    workbenchState = workbenchState,
                )
            }
        }
    }

    private fun ordersState(): OrdersUiState {
        val order = OrderDisplayModel(
            id = "RO-1",
            plate = "蒙A12345",
            customer = "张先生",
            car = "大众帕萨特",
            type = "常规保养",
            status = "在修中",
            statusTone = OrderStatusTone.PRIMARY,
            serviceSummary = "更换机油与滤芯",
            record = "更换机油与滤芯",
            date = "2026-07-20",
            time = "09:30",
            dateTimeLabel = "2026-07-20 · 09:30",
            amountLabel = "¥500",
            insuranceExpiry = "2026-12-31",
            delivery = "2026-07-21",
        )
        return OrdersUiState(loading = false, allOrders = listOf(order), visibleOrders = listOf(order))
    }

    private fun workbenchState() = WorkbenchUiState(
        loading = false,
        companyName = "通达汽车服务中心",
        staffName = "张工",
        title = "今日工作",
        recentOrders = listOf(
            WorkbenchOrder(
                orderNumber = "RO-1",
                plateNumber = "蒙A12345",
                customerName = "张先生",
                statusLabel = "在修中",
                repairSummary = "更换机油与滤芯",
                amountLabel = "¥500",
            ),
        ),
    )
}
