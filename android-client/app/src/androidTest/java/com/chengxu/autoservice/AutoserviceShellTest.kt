package com.chengxu.autoservice

import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onAllNodesWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import com.chengxu.autoservice.core.designsystem.AutoserviceTheme
import com.chengxu.autoservice.core.model.AppPermission
import com.chengxu.autoservice.core.network.ConnectionState
import com.chengxu.autoservice.core.session.MutationDecision
import com.chengxu.autoservice.ui.shell.AutoserviceShell
import com.chengxu.autoservice.ui.stage.StageKind
import com.chengxu.autoservice.ui.workbench.WorkbenchAction
import com.chengxu.autoservice.ui.workbench.WorkbenchSection
import com.chengxu.autoservice.ui.workbench.WorkbenchUiState
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test

class AutoserviceShellTest {
    @get:Rule
    val composeRule = createComposeRule()

    @Test
    fun centerCreateTabIsThirdAndDisabledOffline() {
        launchShell(connection = ConnectionState.Offline)

        composeRule.onAllNodesWithTag("root-tab").assertCountEquals(5)
        composeRule.onNodeWithText("新增").assertIsNotEnabled()
        composeRule.onNodeWithText("网络不可用，当前为只读模式").assertIsDisplayed()
    }

    @Test
    fun allFiveBrandTabsNavigateToHonestStageDestinations() {
        launchShell(connection = ConnectionState.Online)

        assertEquals("工单列表正在升级", StageKind.ORDERS.title)
        composeRule.onAllNodesWithTag("root-tab").assertCountEquals(5)
        composeRule.onNodeWithText("工单").performClick()
        composeRule.onNodeWithText("工单列表正在升级").assertIsDisplayed()
        composeRule.onNodeWithText("新增").performClick()
        composeRule.onNodeWithText("新增工单即将接入").assertIsDisplayed()
        composeRule.onNodeWithText("档案").performClick()
        composeRule.onNodeWithText("客户档案正在整理").assertIsDisplayed()
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

    private fun launchShell(connection: ConnectionState) {
        composeRule.setContent {
            AutoserviceTheme {
                AutoserviceShell(connection = connection)
            }
        }
    }
}
