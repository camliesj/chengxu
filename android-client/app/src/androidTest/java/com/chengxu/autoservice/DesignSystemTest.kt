package com.chengxu.autoservice

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material3.Text
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertHeightIsAtLeast
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.unit.dp
import com.chengxu.autoservice.core.designsystem.AutoserviceTheme
import com.chengxu.autoservice.core.designsystem.BrandButton
import com.chengxu.autoservice.core.designsystem.StatusChip
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
    @Test
    fun statusChipShowsItsRequiredStatusIcon() {
        composeRule.setContent {
            AutoserviceTheme {
                StatusChip(
                    text = "Completed",
                    icon = Icons.Outlined.CheckCircle,
                    iconContentDescription = "Completed status",
                )
            }
        }

        composeRule.onNodeWithText("Completed").assertIsDisplayed()
        composeRule.onNodeWithContentDescription("Completed status").assertIsDisplayed()
    }

    @Test
    fun disabledBrandButtonRetainsTheMinimumTouchTarget() {
        composeRule.setContent {
            AutoserviceTheme {
                BrandButton(onClick = {}, enabled = false) {
                    Text("Disabled brand action")
                }
            }
        }

        composeRule.onNodeWithText("Disabled brand action")
            .assertIsNotEnabled()
            .assertHeightIsAtLeast(48.dp)
    }
}
