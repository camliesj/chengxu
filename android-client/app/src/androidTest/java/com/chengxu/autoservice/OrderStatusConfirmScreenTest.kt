package com.chengxu.autoservice

import androidx.compose.ui.test.assertHasClickAction
import androidx.compose.ui.test.assertHeightIsAtLeast
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.unit.dp
import com.chengxu.autoservice.core.designsystem.AutoserviceTheme
import com.chengxu.autoservice.core.network.ConnectionState
import com.chengxu.autoservice.core.orders.model.OrderDetail
import com.chengxu.autoservice.core.orders.model.OrderStatus
import com.chengxu.autoservice.core.orders.model.OrderSummary
import com.chengxu.autoservice.ui.status.OrderStatusConfirmScreen
import com.chengxu.autoservice.ui.status.OrderStatusTestTags
import com.chengxu.autoservice.ui.status.OrderStatusUiState
import org.junit.Rule
import org.junit.Test

class OrderStatusConfirmScreenTest {
    @get:Rule val composeRule = createComposeRule()

    @Test
    fun confirmationShowsOrderImpactAndAccessibleActions() {
        composeRule.setContent {
            AutoserviceTheme {
                OrderStatusConfirmScreen(state(), onBack = {}, onConfirm = {}, onConfirmUnknown = {})
            }
        }

        composeRule.onNodeWithText("确认更新工单状态").assertIsDisplayed()
        composeRule.onNodeWithText("RO-1").assertIsDisplayed()
        composeRule.onNodeWithText("A-1").assertIsDisplayed()
        composeRule.onNodeWithTag(OrderStatusTestTags.CANCEL).assertHasClickAction().assertHeightIsAtLeast(48.dp)
        composeRule.onNodeWithTag(OrderStatusTestTags.CONFIRM).assertHasClickAction().assertHeightIsAtLeast(48.dp)
    }

    @Test
    fun offlineDisablesStatusSubmit() {
        composeRule.setContent {
            AutoserviceTheme {
                OrderStatusConfirmScreen(state().copy(connection = ConnectionState.Offline), onBack = {}, onConfirm = {}, onConfirmUnknown = {})
            }
        }
        composeRule.onNodeWithTag(OrderStatusTestTags.CONFIRM).assertIsNotEnabled()
    }

    private fun state() = OrderStatusUiState(
        orderId = "RO-1", targetStatus = OrderStatus.COMPLETED, detail = detail(),
        connection = ConnectionState.Online, canSubmit = true,
    )

    private fun detail() = OrderDetail(
        OrderSummary("RO-1", "tongda", 4, "2026-07-22", "2026-07-22", "09:30", "A-1", "Customer", "P7", "Vehicle", OrderStatus.IN_REPAIR.wireValue, 300, "Record", "2027-01-01", "Tomorrow", "now"),
        "150", "Insurer", "Worker", "VIN", "CL", "Accident", "Method", "Remark", 100, 200, "", "", "", null, false, "", "",
    )
}
