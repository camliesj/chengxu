package com.chengxu.autoservice.navigation

import org.junit.Assert.assertEquals
import org.junit.Test

class AppNavigationStateTest {
    @Test
    fun tabsRemainInApprovedOrder() {
        assertEquals(
            listOf("工作台", "工单", "新增", "档案", "我的"),
            RootTab.entries.map(RootTab::label),
        )
    }

    @Test
    fun eachRootTabPreservesItsOwnBackStack() {
        val state = AppNavigationState()
        state.push(AppRoute.OrderDetail("RO-1"))

        state.select(RootTab.ORDERS)
        state.push(AppRoute.OrderDetail("RO-2"))

        state.select(RootTab.WORKBENCH)
        assertEquals(
            listOf(AppRoute.Workbench, AppRoute.OrderDetail("RO-1")),
            state.currentStack,
        )

        state.select(RootTab.ORDERS)
        assertEquals(
            listOf(AppRoute.Orders, AppRoute.OrderDetail("RO-2")),
            state.currentStack,
        )
    }

    @Test
    fun reselectingCurrentTabReturnsOnlyItsStackToRoot() {
        val state = AppNavigationState()
        state.push(AppRoute.OrderDetail("RO-1"))

        state.select(RootTab.ORDERS)
        state.push(AppRoute.OrderDetail("RO-2"))
        state.select(RootTab.ORDERS)

        assertEquals(listOf(AppRoute.Orders), state.currentStack)
        state.select(RootTab.WORKBENCH)
        assertEquals(
            listOf(AppRoute.Workbench, AppRoute.OrderDetail("RO-1")),
            state.currentStack,
        )
    }
}
