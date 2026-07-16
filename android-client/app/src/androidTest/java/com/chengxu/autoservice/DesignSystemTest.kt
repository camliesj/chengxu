package com.chengxu.autoservice

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import com.chengxu.autoservice.core.designsystem.AutoserviceTheme
import com.chengxu.autoservice.ui.shell.OfflineBanner
import org.junit.Rule
import org.junit.Test

class DesignSystemTest {
    @get:Rule
    val composeRule = createComposeRule()

    @Test
    fun offlineBannerNamesTheReadOnlyState() {
        composeRule.setContent { AutoserviceTheme { OfflineBanner() } }

        composeRule.onNodeWithText("网络不可用，当前为只读模式").assertIsDisplayed()
    }
}
