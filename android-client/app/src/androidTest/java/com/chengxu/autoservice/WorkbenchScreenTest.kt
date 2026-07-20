package com.chengxu.autoservice

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.requiredWidth
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.assertHasClickAction
import androidx.compose.ui.test.assertHeightIsAtLeast
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertWidthIsEqualTo
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onFirst
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.test.performClick
import androidx.compose.ui.unit.dp
import com.chengxu.autoservice.core.designsystem.AutoserviceTheme
import com.chengxu.autoservice.core.designsystem.MetricTone
import com.chengxu.autoservice.core.model.AppPermission
import com.chengxu.autoservice.core.session.MutationDecision
import com.chengxu.autoservice.ui.workbench.WorkbenchAction
import com.chengxu.autoservice.ui.workbench.WorkbenchMetric
import com.chengxu.autoservice.ui.workbench.WorkbenchOrder
import com.chengxu.autoservice.ui.workbench.WorkbenchScreen
import com.chengxu.autoservice.ui.workbench.WorkbenchSection
import com.chengxu.autoservice.ui.workbench.WorkbenchUiState
import org.junit.Rule
import org.junit.Assert.assertEquals
import org.junit.Test

class WorkbenchScreenTest {
    @get:Rule
    val composeRule = createComposeRule()

    @Test
    fun employeeWorkbenchShowsTodayWorkWithoutSettlement() {
        setWorkbench(employeeState())

        composeRule.onNodeWithText("今日工作").assertIsDisplayed()
        composeRule.onNodeWithText("你好，张工").assertIsDisplayed()
        listOf("新建", "在修", "待结算", "保险到期").forEach {
            composeRule.onAllNodesWithText(it).onFirst().assertIsDisplayed()
        }
        composeRule.onNodeWithText("今日概览").assertIsDisplayed()
        composeRule.onNodeWithText("快捷操作").assertIsDisplayed()
        composeRule.onNodeWithText("我的待办").assertIsDisplayed()
        composeRule.onNodeWithText("新增工单").assertHasClickAction().assertHeightIsAtLeast(48.dp)
        composeRule.onNodeWithText("蒙K·A3816 · 张先生").assertHasClickAction().assertHeightIsAtLeast(48.dp)
        composeRule.onAllNodesWithText("办理结算").assertCountEquals(0)
    }

    @Test
    fun administratorWorkbenchShowsSummaryAndSettlement() {
        setWorkbench(adminState())

        composeRule.onNodeWithText("管理员工作台").assertIsDisplayed()
        composeRule.onNodeWithText("经营概览").assertIsDisplayed()
        composeRule.onNodeWithText("快捷操作").assertIsDisplayed()
        composeRule.onNodeWithText("优先事项").assertIsDisplayed()
        composeRule.onNodeWithText("办理结算").assertIsDisplayed()
    }

    @Test
    fun longChineseCompanyNameDoesNotRequireHorizontalScrolling() {
        val companyName = "鄂尔多斯市鑫齐恒汽车服务有限公司"
        setWorkbench(adminState(companyName = companyName), widthDp = 360)

        composeRule.onRoot().assertWidthIsEqualTo(360.dp)
        composeRule.onNodeWithText(companyName).assertIsDisplayed()
    }

    @Test
    fun deniedActionShowsTheExactMutationGateReason() {
        setWorkbench(
            employeeState().copy(
                quickActions = listOf(
                    WorkbenchAction(
                        label = "新增工单",
                        permission = AppPermission.CREATE_ORDER,
                        decision = MutationDecision.Denied("网络不可用，当前为只读模式"),
                    ),
                ),
            ),
        )

        composeRule.onNodeWithText("新增工单").performClick()
        composeRule.onNodeWithText("网络不可用，当前为只读模式").assertIsDisplayed()
    }

    @Test
    fun emptyStaleStateShowsMessageAndRetry() {
        setWorkbench(
            employeeState().copy(
                recentOrders = emptyList(),
                syncMessage = "网络异常，当前数据可能不是最新",
                showRetry = true,
            ),
        )

        composeRule.onNodeWithText("网络异常，当前数据可能不是最新").assertIsDisplayed()
        composeRule.onNodeWithText("暂无工单数据").assertIsDisplayed()
        composeRule.onNodeWithText("重新同步").assertIsDisplayed()
    }

    @Test
    fun cachedStaleStateKeepsOrderCardVisible() {
        setWorkbench(
            employeeState().copy(
                syncMessage = "服务器暂时不可用，当前数据可能不是最新",
                showRetry = true,
            ),
        )

        composeRule.onNodeWithText("服务器暂时不可用，当前数据可能不是最新").assertIsDisplayed()
        composeRule.onNodeWithText("蒙A·A3816 · 张先生").assertIsDisplayed()
    }

    @Test
    fun refreshingStateKeepsOrderCardAndShowsProgressCopy() {
        setWorkbench(employeeState().copy(refreshing = true))

        composeRule.onNodeWithText("正在同步…").assertIsDisplayed()
        composeRule.onNodeWithText("蒙A·A3816 · 张先生").assertIsDisplayed()
    }

    @Test
    fun retryClickInvokesRefreshExactlyOnce() {
        var refreshCount = 0
        setWorkbench(
            employeeState().copy(
                syncMessage = "工单数据异常，请稍后重试",
                showRetry = true,
            ),
            onRefresh = { refreshCount += 1 },
        )

        composeRule.onNodeWithText("重新同步").performClick()

        assertEquals(1, refreshCount)
    }

    @Test
    fun recentOrderClickEmitsItsRealIdExactlyOnce() {
        var selectedId: String? = null
        setWorkbench(
            state = employeeState(),
            onOrderSelected = { selectedId = it },
        )

        composeRule.onNodeWithText("蒙K·A3816 · 张先生").performClick()

        assertEquals("RO202607150018", selectedId)
    }

    private fun setWorkbench(
        state: WorkbenchUiState,
        widthDp: Int? = null,
        onRefresh: () -> Unit = {},
        onOrderSelected: (String) -> Unit = {},
    ) {
        composeRule.setContent {
            AutoserviceTheme {
                val screenModifier = if (widthDp == null) Modifier else Modifier.requiredWidth(widthDp.dp)
                Box(modifier = screenModifier) {
                    WorkbenchScreen(
                        state = state,
                        onAction = {},
                        onRefresh = onRefresh,
                        onOrderSelected = onOrderSelected,
                    )
                }
            }
        }
    }

    private fun employeeState(): WorkbenchUiState = WorkbenchUiState(
        loading = false,
        companyName = "通达汽车服务中心",
        staffName = "张工",
        title = "今日工作",
        subtitle = "优先处理在修推进、费用核对与保险到期提醒。",
        statusMetrics = brandStatusMetrics,
        metrics = sampleMetrics,
        sections = listOf(WorkbenchSection.TODAY_QUEUE, WorkbenchSection.ORDER_STATUS),
        quickActions = listOf(
            WorkbenchAction("新增工单", AppPermission.CREATE_ORDER, MutationDecision.Allowed),
        ),
        recentOrders = sampleOrders,
    )

    private fun adminState(companyName: String = "鑫齐恒汽车服务中心"): WorkbenchUiState = WorkbenchUiState(
        loading = false,
        companyName = companyName,
        title = "管理员工作台",
        subtitle = "关注结算节奏、产值进度与高优先事项。",
        statusMetrics = brandStatusMetrics,
        metrics = sampleMetrics,
        businessMetrics = sampleMetrics,
        sections = listOf(
            WorkbenchSection.TODAY_QUEUE,
            WorkbenchSection.ORDER_STATUS,
            WorkbenchSection.BUSINESS_SUMMARY,
        ),
        quickActions = listOf(
            WorkbenchAction("办理结算", AppPermission.SETTLE_ORDER, MutationDecision.Allowed),
        ),
        recentOrders = sampleOrders,
    )

    private companion object {
        val brandStatusMetrics = listOf(
            WorkbenchMetric("新建", "06", "待接单", MetricTone.PRIMARY),
            WorkbenchMetric("在修", "18", "维修看板", MetricTone.SUCCESS),
            WorkbenchMetric("待结算", "05", "费用核对", MetricTone.WARNING),
            WorkbenchMetric("保险到期", "09", "联系车主", MetricTone.DANGER),
        )
        val sampleMetrics = listOf(
            WorkbenchMetric("在修车辆", "18", "负荷平稳", MetricTone.SUCCESS),
            WorkbenchMetric("保险到期", "09", "高优先跟进", MetricTone.DANGER),
        )
        val sampleOrders = listOf(
            WorkbenchOrder(
                orderNumber = "RO202607150018",
                plateNumber = "蒙K·A3816",
                customerName = "张先生",
                statusLabel = "待结算",
                repairSummary = "费用已确认，等待管理员完成结算",
                amountLabel = "合计 3,040",
            ),
        )
    }
}
