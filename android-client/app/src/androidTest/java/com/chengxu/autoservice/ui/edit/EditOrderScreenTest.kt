package com.chengxu.autoservice.ui.edit

import androidx.compose.ui.test.assertHasClickAction
import androidx.compose.ui.test.assertHeightIsAtLeast
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performClick
import androidx.compose.ui.unit.dp
import com.chengxu.autoservice.core.designsystem.AutoserviceTheme
import com.chengxu.autoservice.core.network.ConnectionState
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test

class EditOrderScreenTest {
    @get:Rule val composeRule = createComposeRule()

    @Test
    fun normalEditorAlwaysOffersReturnToDetail() {
        var returnCalls = 0
        composeRule.setContent {
            AutoserviceTheme {
                EditOrderScreen(
                    state = EditOrderUiState(
                        loading = false,
                        orderId = "RO-1",
                        connection = ConnectionState.Online,
                        canEdit = true,
                    ),
                    onUpdate = { _, _ -> },
                    onNext = {},
                    onBack = {},
                    onSubmit = {},
                    onConfirm = {},
                    onSaveDraft = {},
                    onReturn = { returnCalls += 1 },
                    onRebase = {},
                )
            }
        }

        composeRule.onNodeWithTag(EditOrderTestTags.CANCEL)
            .assertHasClickAction()
            .assertHeightIsAtLeast(48.dp)
            .performClick()
        assertEquals(1, returnCalls)
    }
}
