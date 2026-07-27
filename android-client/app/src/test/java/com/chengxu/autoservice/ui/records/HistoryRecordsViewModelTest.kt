package com.chengxu.autoservice.ui.records

import com.chengxu.autoservice.core.orders.HistoryOrdersDataSource
import com.chengxu.autoservice.core.orders.HistoryOrdersSnapshot
import com.chengxu.autoservice.core.orders.OrderSyncState
import com.chengxu.autoservice.core.orders.model.OrderSummary
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import java.time.LocalDate

@OptIn(ExperimentalCoroutinesApi::class)
class HistoryRecordsViewModelTest {
    private val dispatcher = UnconfinedTestDispatcher()

    @Before
    fun setUp() = Dispatchers.setMain(dispatcher)

    @After
    fun tearDown() = Dispatchers.resetMain()

    @Test
    fun queryAndTimeFilterOnlyExposeMatchingSettledHistory() = runTest {
        val source = FakeHistorySource(
            HistoryOrdersSnapshot(
                orders = listOf(
                    order("H-new", "蒙A12345", "2026-07-20"),
                    order("H-old", "蒙B12345", "2026-05-01"),
                ),
                syncState = OrderSyncState.Ready,
            ),
        )
        val viewModel = HistoryRecordsViewModel(source, today = { LocalDate.parse("2026-07-27") })

        viewModel.updateQuery("蒙A")
        runCurrent()
        assertEquals(listOf("H-new"), viewModel.uiState.value.visibleOrders.map { it.id })

        viewModel.updateQuery("")
        viewModel.selectTimeFilter(HistoryTimeFilter.LAST_30_DAYS)
        runCurrent()
        assertEquals(listOf("H-new"), viewModel.uiState.value.visibleOrders.map { it.id })
    }

    @Test
    fun loadMoreDelegatesOnlyWhenMoreHistoryExists() = runTest {
        val source = FakeHistorySource(
            HistoryOrdersSnapshot(
                orders = listOf(order("H-1", "蒙A12345", "2026-07-20")),
                nextCursor = "cursor-2",
                syncState = OrderSyncState.Ready,
            ),
        )
        val viewModel = HistoryRecordsViewModel(source)

        viewModel.loadNextPage()
        runCurrent()

        assertEquals(1, source.loadNextCount)
    }

    private fun order(id: String, plate: String, date: String) = OrderSummary(
        id = id,
        companyId = "tongda",
        version = 1,
        date = date,
        dateSortKey = date,
        time = "09:30",
        plate = plate,
        customer = "张先生",
        car = "大众帕萨特",
        type = "常规保养",
        status = "已结算",
        amountCents = 50_025,
        record = "更换机油与滤芯",
        insuranceExpiry = "2026-08-01",
        delivery = "2026-07-20 18:00",
        updatedAt = "2026-07-20T09:30:00Z",
    )

    private class FakeHistorySource(initial: HistoryOrdersSnapshot) : HistoryOrdersDataSource {
        override val snapshot: StateFlow<HistoryOrdersSnapshot> = MutableStateFlow(initial)
        var loadNextCount = 0

        override suspend fun refresh() = Unit

        override suspend fun loadNextPage() {
            loadNextCount += 1
        }
    }
}
