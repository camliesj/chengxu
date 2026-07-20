package com.chengxu.autoservice

import androidx.compose.ui.test.assertHasClickAction
import androidx.compose.ui.test.assertHeightIsAtLeast
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.unit.dp
import com.chengxu.autoservice.core.designsystem.AutoserviceTheme
import com.chengxu.autoservice.ui.orders.OrderDetailScreen
import com.chengxu.autoservice.ui.orders.OrderDisplayModel
import com.chengxu.autoservice.ui.orders.OrderStatusTone
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test

class OrderDetailScreenTest {
    @get:Rule
    val composeRule = createComposeRule()

    @Test
    fun populatedDetailShowsAllApprovedReadOnlySections() {
        var backCount = 0
        composeRule.setContent {
            AutoserviceTheme {
                OrderDetailScreen(order = order(), onBack = { backCount += 1 })
            }
        }

        composeRule.onNodeWithText("工单详情").assertIsDisplayed()
        composeRule.onNodeWithText("只读").assertIsDisplayed()
        composeRule.onNodeWithText("蒙A12345").assertIsDisplayed()
        listOf("工单信息", "车辆与服务", "交付与保障", "费用").forEach {
            composeRule.onNodeWithText(it).assertIsDisplayed()
        }
        composeRule.onNodeWithText("¥1,234.56").assertIsDisplayed()
        composeRule.onNodeWithText("2026-07-20").assertIsDisplayed()
        composeRule.onNodeWithText("09:30").assertIsDisplayed()
        composeRule.onNodeWithContentDescription("返回")
            .assertHasClickAction()
            .assertHeightIsAtLeast(48.dp)
            .performClick()
        assertEquals(1, backCount)

        listOf("新增工单", "编辑", "推进状态", "办理结算").forEach {
            composeRule.onAllNodesWithText(it).assertCountEquals(0)
        }
    }

    @Test
    fun missingDetailShowsInvalidationAndReturnAction() {
        var backCount = 0
        composeRule.setContent {
            AutoserviceTheme {
                OrderDetailScreen(order = null, onBack = { backCount += 1 })
            }
        }

        composeRule.onNodeWithText("工单不存在或已失效").assertIsDisplayed()
        composeRule.onNodeWithText("返回工单列表")
            .assertHasClickAction()
            .assertHeightIsAtLeast(48.dp)
            .performClick()

        assertEquals(1, backCount)
    }

    private fun order() = OrderDisplayModel(
        id = "RO-20260720-001",
        plate = "蒙A12345",
        customer = "张先生",
        car = "大众帕萨特",
        type = "事故维修",
        status = "待结算",
        statusTone = OrderStatusTone.WARNING,
        serviceSummary = "更换前保险杠并喷漆",
        record = "更换前保险杠并喷漆",
        date = "2026-07-20",
        time = "09:30",
        dateTimeLabel = "2026-07-20 · 09:30",
        amountLabel = "¥1,234.56",
        insuranceExpiry = "2026-12-31",
        delivery = "2026-07-22",
    )
}
