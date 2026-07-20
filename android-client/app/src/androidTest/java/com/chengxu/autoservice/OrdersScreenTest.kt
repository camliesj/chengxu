package com.chengxu.autoservice

import androidx.compose.ui.test.assertHasClickAction
import androidx.compose.ui.test.assertHeightIsAtLeast
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onFirst
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTextInput
import androidx.compose.ui.unit.dp
import com.chengxu.autoservice.core.designsystem.AutoserviceTheme
import com.chengxu.autoservice.ui.orders.OrderDisplayModel
import com.chengxu.autoservice.ui.orders.OrderStatusFilter
import com.chengxu.autoservice.ui.orders.OrderStatusTone
import com.chengxu.autoservice.ui.orders.OrdersScreen
import com.chengxu.autoservice.ui.orders.OrdersTestTags
import com.chengxu.autoservice.ui.orders.OrdersUiState
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test

class OrdersScreenTest {
    @get:Rule
    val composeRule = createComposeRule()

    @Test
    fun populatedListShowsCountAndInteractiveOrderCards() {
        var selectedId: String? = null
        val orders = listOf(order("RO-PENDING", status = "待结算"), order("RO-SETTLED", status = "已结算"))
        setOrders(
            state = readyState(orders),
            onOrderSelected = { selectedId = it },
        )

        composeRule.onNodeWithText("工单").assertIsDisplayed()
        composeRule.onNodeWithText("共 2 单").assertIsDisplayed()
        composeRule.onAllNodesWithText("蒙A12345 · 张先生").onFirst().assertIsDisplayed()
        composeRule.onNodeWithTag("${OrdersTestTags.ORDER_CARD_PREFIX}RO-PENDING")
            .assertHasClickAction()
            .assertHeightIsAtLeast(48.dp)
            .performClick()

        assertEquals("RO-PENDING", selectedId)
    }

    @Test
    fun searchAndFilterControlsEmitExactValues() {
        var query = ""
        var filter = OrderStatusFilter.ALL
        setOrders(
            state = readyState(listOf(order("RO-PENDING", status = "待结算"))),
            onQueryChange = { query = it },
            onFilterSelected = { filter = it },
        )

        composeRule.onNodeWithTag(OrdersTestTags.SEARCH).performTextInput("张先生")
        composeRule.onNodeWithTag("${OrdersTestTags.FILTER_PREFIX}待结算")
            .assertHeightIsAtLeast(48.dp)
            .performClick()

        assertEquals("张先生", query)
        assertEquals(OrderStatusFilter.PENDING_SETTLEMENT, filter)
    }

    @Test
    fun loadingStateShowsApprovedCopy() {
        setOrders(state = OrdersUiState())
        composeRule.onNodeWithText("正在加载工单").assertIsDisplayed()
    }

    @Test
    fun refreshingStateKeepsCachedCards() {
        setOrders(
            state = readyState(listOf(order("RO-CACHED"))).copy(refreshing = true),
        )
        composeRule.onNodeWithText("正在同步…").assertIsDisplayed()
        composeRule.onNodeWithTag("${OrdersTestTags.ORDER_CARD_PREFIX}RO-CACHED").assertIsDisplayed()
    }

    @Test
    fun staleOnlineStateRetriesExactlyOnceWhileKeepingCachedRows() {
        var refreshCount = 0
        setOrders(
            state = readyState(listOf(order("RO-CACHED"))).copy(
                syncMessage = "网络异常，当前数据可能不是最新",
                showRetry = true,
            ),
            onRefresh = { refreshCount += 1 },
        )

        composeRule.onNodeWithText("网络异常，当前数据可能不是最新").assertIsDisplayed()
        composeRule.onNodeWithTag("${OrdersTestTags.ORDER_CARD_PREFIX}RO-CACHED").assertIsDisplayed()
        composeRule.onNodeWithTag(OrdersTestTags.RETRY).performClick()

        assertEquals(1, refreshCount)
    }

    @Test
    fun offlineStateDoesNotExposeRetry() {
        setOrders(
            state = readyState(listOf(order("RO-CACHED"))).copy(
                syncMessage = "服务器暂时不可用，当前数据可能不是最新",
                showRetry = true,
            ),
            isOffline = true,
        )

        composeRule.onNodeWithText("服务器暂时不可用，当前数据可能不是最新").assertIsDisplayed()
        composeRule.onNodeWithTag(OrdersTestTags.RETRY).assertDoesNotExist()
    }

    @Test
    fun trueEmptyStateDoesNotExposeClearFilters() {
        setOrders(state = OrdersUiState(loading = false))
        composeRule.onNodeWithText("暂无工单").assertIsDisplayed()
        composeRule.onNodeWithTag(OrdersTestTags.CLEAR_FILTERS).assertDoesNotExist()
    }

    @Test
    fun noMatchStateClearsFiltersExactlyOnce() {
        var clearCount = 0
        setOrders(
            state = OrdersUiState(
                loading = false,
                query = "不存在",
                allOrders = listOf(order("RO-1")),
                visibleOrders = emptyList(),
            ),
            onClearFilters = { clearCount += 1 },
        )
        composeRule.onNodeWithText("没有匹配的工单").assertIsDisplayed()
        composeRule.onNodeWithTag(OrdersTestTags.CLEAR_FILTERS)
            .assertHeightIsAtLeast(48.dp)
            .performClick()

        assertEquals(1, clearCount)
    }

    @Test
    fun unknownStatusRemainsVisibleUnderAll() {
        setOrders(state = readyState(listOf(order("RO-UNKNOWN", status = "厂家待件"))))

        composeRule.onNodeWithText("厂家待件").assertIsDisplayed()
        composeRule.onNodeWithTag("${OrdersTestTags.ORDER_CARD_PREFIX}RO-UNKNOWN").assertIsDisplayed()
    }

    private fun setOrders(
        state: OrdersUiState,
        isOffline: Boolean = false,
        onQueryChange: (String) -> Unit = {},
        onFilterSelected: (OrderStatusFilter) -> Unit = {},
        onClearFilters: () -> Unit = {},
        onRefresh: () -> Unit = {},
        onOrderSelected: (String) -> Unit = {},
    ) {
        composeRule.setContent {
            AutoserviceTheme {
                OrdersScreen(
                    state = state,
                    isOffline = isOffline,
                    onQueryChange = onQueryChange,
                    onFilterSelected = onFilterSelected,
                    onClearFilters = onClearFilters,
                    onRefresh = onRefresh,
                    onOrderSelected = onOrderSelected,
                )
            }
        }
    }

    private fun readyState(orders: List<OrderDisplayModel>) = OrdersUiState(
        loading = false,
        allOrders = orders,
        visibleOrders = orders,
    )

    private fun order(
        id: String,
        status: String = "在修中",
    ) = OrderDisplayModel(
        id = id,
        plate = "蒙A12345",
        customer = "张先生",
        car = "大众帕萨特",
        type = "常规保养",
        status = status,
        statusTone = when (status) {
            "待结算" -> OrderStatusTone.WARNING
            "已结算" -> OrderStatusTone.SUCCESS
            else -> OrderStatusTone.NEUTRAL
        },
        serviceSummary = "更换机油与滤芯",
        record = "更换机油与滤芯",
        date = "2026-07-20",
        time = "09:30",
        dateTimeLabel = "2026-07-20 · 09:30",
        amountLabel = "¥500.25",
        insuranceExpiry = "2026-12-31",
        delivery = "2026-07-21",
    )
}
