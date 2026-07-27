package com.chengxu.autoservice.navigation

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.assertIsEnabled
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertTextEquals
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onAllNodesWithTag
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTextInput
import com.chengxu.autoservice.core.designsystem.AutoserviceTheme
import com.chengxu.autoservice.core.network.ConnectionState
import com.chengxu.autoservice.core.orders.model.BusinessCapability
import com.chengxu.autoservice.core.orders.model.OrderDetail
import com.chengxu.autoservice.core.orders.model.OrderStatus
import com.chengxu.autoservice.core.orders.model.OrderSummary
import com.chengxu.autoservice.ui.create.CreateOrderField
import com.chengxu.autoservice.ui.create.CreateOrderTestTags
import com.chengxu.autoservice.ui.create.CreateOrderUiState
import com.chengxu.autoservice.ui.edit.EditOrderField
import com.chengxu.autoservice.ui.edit.EditOrderUiState
import com.chengxu.autoservice.ui.orders.OrderDisplayModel
import com.chengxu.autoservice.ui.orders.OrderDetailUiState
import com.chengxu.autoservice.ui.orders.OrderStatusFilter
import com.chengxu.autoservice.ui.orders.OrderStatusTone
import com.chengxu.autoservice.ui.orders.OrdersTestTags
import com.chengxu.autoservice.ui.orders.OrdersUiState
import com.chengxu.autoservice.ui.status.OrderStatusTestTags
import com.chengxu.autoservice.ui.status.OrderStatusUiState
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

    @Test
    fun createFormRendersTheUpdatedFieldStateWhileItsEntryRemainsActive() {
        var state by mutableStateOf(
            CreateOrderUiState(
                loading = false,
                connection = ConnectionState.Online,
            ),
        )

        composeRule.setContent {
            AutoserviceTheme {
                AppNavDisplay(
                    navigationState = AppNavigationState(initialTab = RootTab.CREATE),
                    createState = state,
                    onCreateUpdate = { field, value ->
                        state = state.copy(fields = state.fields.with(field, value))
                    },
                )
            }
        }

        composeRule
            .onNodeWithTag("${CreateOrderTestTags.FIELD_PREFIX}customer")
            .performTextInput("张三")

        composeRule
            .onNodeWithTag("${CreateOrderTestTags.FIELD_PREFIX}customer")
            .assertTextEquals("张三")
    }

    @Test
    fun editFormRendersTheUpdatedFieldStateWhileItsEntryRemainsActive() {
        val navigationState = AppNavigationState(initialTab = RootTab.ORDERS).apply {
            push(AppRoute.EditOrder("O-EDIT"))
        }
        var state by mutableStateOf(
            EditOrderUiState(
                loading = false,
                orderId = "O-EDIT",
                connection = ConnectionState.Online,
            ),
        )

        composeRule.setContent {
            AutoserviceTheme {
                AppNavDisplay(
                    navigationState = navigationState,
                    editState = state,
                    onEditUpdate = { field, value ->
                        state = state.copy(fields = state.fields.with(field, value))
                    },
                )
            }
        }

        composeRule
            .onNodeWithTag("${CreateOrderTestTags.FIELD_PREFIX}customer")
            .performTextInput("李四")

        composeRule
            .onNodeWithTag("${CreateOrderTestTags.FIELD_PREFIX}customer")
            .assertTextEquals("李四")
    }

    @Test
    fun orderDetailRendersEditActionAfterItsCapabilitiesLoadWhileEntryRemainsActive() {
        val order = order("O-DETAIL", OrderStatus.IN_REPAIR.wireValue)
        val navigationState = AppNavigationState(initialTab = RootTab.ORDERS).apply {
            push(AppRoute.OrderDetail(order.id))
        }
        var state by mutableStateOf(OrderDetailUiState())
        var editCalls = 0

        composeRule.setContent {
            AutoserviceTheme {
                AppNavDisplay(
                    navigationState = navigationState,
                    ordersState = OrdersUiState(
                        loading = false,
                        allOrders = listOf(order),
                        visibleOrders = listOf(order),
                    ),
                    detailState = state,
                    onEditOrder = { editCalls += 1 },
                )
            }
        }

        composeRule.onAllNodesWithTag("edit-order").assertCountEquals(0)
        composeRule.runOnIdle {
            state = editableDetail(order.id)
        }

        composeRule.onNodeWithTag("edit-order").assertIsDisplayed().performClick()
        check(editCalls == 1)
    }

    @Test
    fun statusConfirmationRendersItsLoadedStateWhileEntryRemainsActive() {
        val orderId = "O-STATUS"
        val navigationState = AppNavigationState(initialTab = RootTab.ORDERS).apply {
            push(AppRoute.ChangeOrderStatus(orderId, OrderStatus.COMPLETED.wireValue))
        }
        var state by mutableStateOf(OrderStatusUiState(loading = true, orderId = orderId))
        var confirmCalls = 0

        composeRule.setContent {
            AutoserviceTheme {
                AppNavDisplay(
                    navigationState = navigationState,
                    statusState = state,
                    onStatusConfirm = { confirmCalls += 1 },
                )
            }
        }

        composeRule.runOnIdle {
            state = OrderStatusUiState(
                loading = false,
                orderId = orderId,
                targetStatus = OrderStatus.COMPLETED,
                detail = requireNotNull(editableDetail(orderId).detail),
                canSubmit = true,
                connection = ConnectionState.Online,
            )
        }

        composeRule
            .onNodeWithTag(OrderStatusTestTags.CONFIRM)
            .assertIsEnabled()
            .performClick()
        check(confirmCalls == 1)
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
    private fun editableDetail(orderId: String) = OrderDetailUiState(
        detail = OrderDetail(
            summary = OrderSummary(
                id = orderId,
                companyId = "company-1",
                version = 1,
                date = "2026-07-27",
                dateSortKey = "2026-07-27",
                time = "09:30",
                plate = "京A12345",
                customer = "张三",
                car = "大众帕萨特",
                type = "常规保养",
                status = OrderStatus.IN_REPAIR.wireValue,
                amountCents = 50000,
                record = "更换机油",
                insuranceExpiry = "2026-12-31",
                delivery = "待确认",
                updatedAt = "2026-07-27T09:30:00Z",
            ),
            phone = "13800000000",
            insurer = "人保财险",
            staff = "张工",
            vin = "",
            claimNo = "",
            accidentType = "",
            paymentMethod = "",
            remark = "",
            laborCents = 0,
            materialCents = 0,
            settlementDate = "",
            settlementTime = "",
            settlementRemark = "",
            receipt = null,
            voided = false,
            voidedAt = "",
            voidReason = "",
        ),
        capabilities = setOf(BusinessCapability.EDIT_ORDER),
    )
}
