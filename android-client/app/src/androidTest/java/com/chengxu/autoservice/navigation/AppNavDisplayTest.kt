package com.chengxu.autoservice.navigation

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performClick
import com.chengxu.autoservice.core.designsystem.AutoserviceTheme
import com.chengxu.autoservice.ui.orders.OrderDisplayModel
import com.chengxu.autoservice.ui.orders.OrderStatusFilter
import com.chengxu.autoservice.ui.orders.OrderStatusTone
import com.chengxu.autoservice.ui.orders.OrdersTestTags
import com.chengxu.autoservice.ui.orders.OrdersUiState
import org.junit.Rule
import org.junit.Test

class AppNavDisplayTest {
    @get:Rule val composeRule = createComposeRule()

    @Test
    fun filterUpdatesTheActiveOrdersEntryWithoutLeavingTheTab() {
        val pending = order("O-PENDING", "待结算")
        val repairing = order("O-REPAIR", "在修中")
        val allOrders = listOf(pending, repairing)
        var state by mutableStateOf(
            OrdersUiState(
                loading = false,
                allOrders = allOrders,
                visibleOrders = allOrders,
            ),
        )

        composeRule.setContent {
            AutoserviceTheme {
                AppNavDisplay(
                    navigationState = AppNavigationState(initialTab = RootTab.ORDERS),
                    ordersState = state,
                    onOrdersFilterSelected = { filter ->
                        state = state.copy(
                            selectedFilter = filter,
                            visibleOrders = when (filter) {
                                OrderStatusFilter.REPAIRING -> listOf(repairing)
                                OrderStatusFilter.PENDING_SETTLEMENT -> listOf(pending)
                                else -> allOrders
                            },
                        )
                    },
                )
            }
        }

        composeRule.onNodeWithTag("${OrdersTestTags.FILTER_PREFIX}在修中").performClick()

        composeRule.onNodeWithTag("${OrdersTestTags.ORDER_CARD_PREFIX}O-REPAIR").assertIsDisplayed()
        composeRule.onNodeWithTag("${OrdersTestTags.ORDER_CARD_PREFIX}O-PENDING").assertDoesNotExist()
    }

    private fun order(id: String, status: String) = OrderDisplayModel(
        id = id,
        plate = "蒙A12345",
        customer = "张先生",
        car = "大众帕萨特",
        type = "常规保养",
        status = status,
        statusTone = OrderStatusTone.NEUTRAL,
        serviceSummary = "更换机油",
        record = "更换机油",
        date = "2026-07-20",
        time = "09:30",
        dateTimeLabel = "2026-07-20 · 09:30",
        amountLabel = "¥500.00",
        insuranceExpiry = "2026-12-31",
        delivery = "待确认",
    )
}
