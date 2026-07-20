package com.chengxu.autoservice.ui.orders

import com.chengxu.autoservice.core.orders.OrderSyncState
import com.chengxu.autoservice.core.orders.OrdersRepository
import com.chengxu.autoservice.core.orders.OrdersSnapshot
import com.chengxu.autoservice.core.orders.RepairOrder
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class OrdersViewModelTest {
    private val dispatcher = UnconfinedTestDispatcher()

    @Before
    fun setUp() {
        Dispatchers.setMain(dispatcher)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun loadingCacheMapsToLoadingState() = runTest {
        val viewModel = OrdersViewModel(FakeOrdersRepository(OrdersSnapshot()))

        val state = viewModel.uiState.first { it.loading }

        assertTrue(state.allOrders.isEmpty())
        assertFalse(state.refreshing)
    }

    @Test
    fun staleSnapshotKeepsCachedRowsAndExposesRetryMessage() = runTest {
        val viewModel = OrdersViewModel(
            FakeOrdersRepository(
                OrdersSnapshot(
                    orders = listOf(order("RO-CACHED")),
                    syncState = OrderSyncState.Stale("网络异常，当前数据可能不是最新"),
                ),
            ),
        )

        val state = viewModel.uiState.first { it.syncMessage != null }

        assertEquals("网络异常，当前数据可能不是最新", state.syncMessage)
        assertTrue(state.showRetry)
        assertEquals(listOf("RO-CACHED"), state.visibleOrders.map { it.id })
    }

    @Test
    fun refreshingSnapshotKeepsRowsAndExposesProgress() = runTest {
        val viewModel = OrdersViewModel(
            FakeOrdersRepository(
                OrdersSnapshot(
                    orders = listOf(order("RO-CACHED")),
                    syncState = OrderSyncState.Refreshing,
                ),
            ),
        )

        val state = viewModel.uiState.first { it.refreshing }

        assertFalse(state.loading)
        assertEquals(listOf("RO-CACHED"), state.visibleOrders.map { it.id })
    }

    @Test
    fun queryAndStatusSurviveRepositoryRefresh() = runTest {
        val repository = FakeOrdersRepository(
            OrdersSnapshot(
                orders = listOf(order(id = "RO-1", customer = "张先生", status = "待结算")),
                syncState = OrderSyncState.Ready,
            ),
        )
        val viewModel = OrdersViewModel(repository)

        viewModel.updateQuery("张先生")
        viewModel.selectFilter(OrderStatusFilter.PENDING_SETTLEMENT)
        repository.emit(
            OrdersSnapshot(
                orders = listOf(order(id = "RO-2", customer = "张先生", status = "待结算")),
                syncState = OrderSyncState.Refreshing,
            ),
        )

        val state = viewModel.uiState.first { it.visibleOrders.singleOrNull()?.id == "RO-2" }
        assertEquals("张先生", state.query)
        assertEquals(OrderStatusFilter.PENDING_SETTLEMENT, state.selectedFilter)
        assertTrue(state.refreshing)
    }

    @Test
    fun clearFiltersRestoresAllRows() = runTest {
        val viewModel = OrdersViewModel(
            FakeOrdersRepository(
                OrdersSnapshot(
                    orders = listOf(
                        order(id = "RO-1", customer = "张先生", status = "待结算"),
                        order(id = "RO-2", customer = "王女士", status = "已结算"),
                    ),
                    syncState = OrderSyncState.Ready,
                ),
            ),
        )

        viewModel.updateQuery("不存在")
        viewModel.selectFilter(OrderStatusFilter.PENDING_SETTLEMENT)
        val noMatch = viewModel.uiState.first { it.hasActiveFilters && it.visibleOrders.isEmpty() }
        assertEquals(2, noMatch.totalCount)

        viewModel.clearFilters()
        val restored = viewModel.uiState.first { !it.hasActiveFilters }
        assertEquals(listOf("RO-1", "RO-2"), restored.visibleOrders.map { it.id })
    }

    @Test
    fun laterSnapshotRemovesMissingOrderFromAllOrders() = runTest {
        val repository = FakeOrdersRepository(
            OrdersSnapshot(
                orders = listOf(order("RO-1")),
                syncState = OrderSyncState.Ready,
            ),
        )
        val viewModel = OrdersViewModel(repository)
        viewModel.uiState.first { it.allOrders.any { row -> row.id == "RO-1" } }

        repository.emit(OrdersSnapshot(syncState = OrderSyncState.Ready))

        val state = viewModel.uiState.first { it.allOrders.isEmpty() && !it.loading }
        assertFalse(state.allOrders.any { it.id == "RO-1" })
    }

    @Test
    fun readyEmptySnapshotIsATrueEmptyState() = runTest {
        val viewModel = OrdersViewModel(
            FakeOrdersRepository(OrdersSnapshot(syncState = OrderSyncState.Ready)),
        )

        val state = viewModel.uiState.first { !it.loading }

        assertTrue(state.allOrders.isEmpty())
        assertFalse(state.hasActiveFilters)
        assertFalse(state.showRetry)
    }

    @Test
    fun refreshDelegatesExactlyOnce() = runTest {
        val repository = FakeOrdersRepository(OrdersSnapshot(syncState = OrderSyncState.Ready))
        val viewModel = OrdersViewModel(repository)

        viewModel.refresh()
        advanceUntilIdle()

        assertEquals(1, repository.refreshCount)
    }

    private fun order(
        id: String,
        customer: String = "张先生",
        status: String = "在修中",
    ) = RepairOrder(
        id = id,
        companyId = "tongda",
        date = "2026-07-20",
        dateSortKey = "2026-07-20",
        time = "09:30",
        plate = "蒙A12345",
        customer = customer,
        car = "大众帕萨特",
        type = "常规保养",
        status = status,
        amountCents = 50_025,
        record = "更换机油与滤芯",
        insuranceExpiry = "2026-12-31",
        delivery = "2026-07-21",
    )

    private class FakeOrdersRepository(initial: OrdersSnapshot) : OrdersRepository {
        override val snapshot = MutableStateFlow(initial)
        var refreshCount = 0

        fun emit(value: OrdersSnapshot) {
            snapshot.value = value
        }

        override suspend fun refresh() {
            refreshCount += 1
        }
    }
}
