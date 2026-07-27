package com.chengxu.autoservice

import androidx.compose.material3.Text
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class AutoserviceSafeAreaTest {
    @get:Rule val composeRule = createComposeRule()

    @Test
    fun rootSafeAreaLayoutDisplaysItsContent() {
        composeRule.setContent {
            AutoserviceRootLayout {
                Text("safe-area-content", modifier = Modifier.testTag("safe-area-content"))
            }
        }

        composeRule.onNodeWithTag("safe-area-content").assertIsDisplayed()
    }
}
