package com.chengxu.autoservice

import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onAllNodesWithTag
import androidx.compose.ui.test.onNodeWithText
import com.chengxu.autoservice.core.designsystem.AutoserviceTheme
import com.chengxu.autoservice.core.network.ConnectionState
import com.chengxu.autoservice.ui.shell.AutoserviceShell
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

    private fun launchShell(connection: ConnectionState) {
        composeRule.setContent {
            AutoserviceTheme {
                AutoserviceShell(connection = connection)
            }
        }
    }
}
