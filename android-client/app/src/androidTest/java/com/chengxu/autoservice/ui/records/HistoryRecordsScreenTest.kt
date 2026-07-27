package com.chengxu.autoservice.ui.records

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.getBoundsInRoot
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performClick
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.chengxu.autoservice.ui.orders.OrderDisplayModel
import com.chengxu.autoservice.ui.orders.OrderStatusTone
import org.junit.Rule
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class HistoryRecordsScreenTest {
    @get:Rule
    val composeRule = createComposeRule()

    @Test
    fun historyScreenShowsReadOnlyNoticeAndLoadsNextPage() {
        var loadMoreCount = 0
        composeRule.setContent {
            HistoryRecordsScreen(
                state = HistoryRecordsUiState(
                    allOrders = listOf(displayOrder()),
                    visibleOrders = listOf(displayOrder()),
                    hasMore = true,
                ),
                isOffline = false,
                onQueryChange = {},
                onTimeFilterChange = {},
                onClearFilters = {},
                onRefresh = {},
                onLoadMore = { loadMoreCount += 1 },
                onOrderSelected = {},
            )
        }

        composeRule.onNodeWithTag(HistoryRecordsTestTags.ROOT).assertIsDisplayed()
        composeRule.onNodeWithTag(HistoryRecordsTestTags.READ_ONLY_NOTICE).assertIsDisplayed()
        composeRule.onNodeWithTag("${HistoryRecordsTestTags.ORDER_CARD_PREFIX}H-1").assertIsDisplayed()
        composeRule.onNodeWithTag(HistoryRecordsTestTags.LOAD_MORE).performClick()

        assertEquals(1, loadMoreCount)
    }

    @Test
    fun historyFilterLabelIsVerticallyCenteredInsideItsTouchTarget() {
        composeRule.setContent {
            HistoryRecordsScreen(
                state = HistoryRecordsUiState(),
                isOffline = false,
                onQueryChange = {},
                onTimeFilterChange = {},
                onClearFilters = {},
                onRefresh = {},
                onLoadMore = {},
                onOrderSelected = {},
            )
        }

        val filterBounds = composeRule
            .onNodeWithTag("${HistoryRecordsTestTags.FILTER_PREFIX}LAST_30_DAYS")
            .getBoundsInRoot()
        val labelBounds = composeRule
            .onNodeWithTag("history-records-filter-label-LAST_30_DAYS", useUnmergedTree = true)
            .getBoundsInRoot()

        assertEquals(
            (filterBounds.top.value + filterBounds.bottom.value) / 2f,
            (labelBounds.top.value + labelBounds.bottom.value) / 2f,
            0.5f,
        )
    }

    private fun displayOrder() = OrderDisplayModel(
        id = "H-1",
        plate = "蒙A12345",
        customer = "张先生",
        car = "大众帕萨特",
        type = "常规保养",
        status = "已结算",
        statusTone = OrderStatusTone.SUCCESS,
        serviceSummary = "更换机油与滤芯",
        record = "更换机油与滤芯",
        date = "2026-07-20",
        time = "09:30",
        dateTimeLabel = "2026-07-20 · 09:30",
        amountLabel = "¥500.25",
        insuranceExpiry = "2026-08-01",
        delivery = "2026-07-20 18:00",
    )
}
