package com.chengxu.autoservice.ui.orders

import com.chengxu.autoservice.core.orders.OrderDetailRepository
import com.chengxu.autoservice.core.orders.OrderReadFailure
import com.chengxu.autoservice.core.orders.OrderReadResult
import com.chengxu.autoservice.core.orders.model.BusinessCapability
import com.chengxu.autoservice.core.orders.model.OrderDetail
import com.chengxu.autoservice.core.orders.model.OrderDetailEnvelope
import com.chengxu.autoservice.core.orders.model.OrderSummary
import com.chengxu.autoservice.core.orders.model.OrderStatus
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Assert.assertFalse
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class OrderDetailViewModelTest {
    private val dispatcher = StandardTestDispatcher()
    @Before fun setUp() = Dispatchers.setMain(dispatcher)
    @After fun tearDown() = Dispatchers.resetMain()

    @Test
    fun opensFullDetailAndExposesTheServerEditCapability() = runTest {
        val model = OrderDetailViewModel(FakeRepository(OrderReadResult.Success(OrderDetailEnvelope(detail(), setOf(BusinessCapability.EDIT_ORDER), "now"))))
        model.open("RO-1")
        advanceUntilIdle()

        assertEquals("150", model.uiState.value.detail?.phone)
        assertTrue(model.uiState.value.canEdit)
    }

    @Test
    fun notFoundClosesTheUnavailableDetail() = runTest {
        val model = OrderDetailViewModel(FakeRepository(OrderReadResult.Failure(OrderReadFailure.NotFound)))
        model.open("RO-1")
        advanceUntilIdle()

        assertTrue(model.uiState.value.closeRequested)
    }

    @Test
    fun settledOrderNeverExposesTheEditEntryEvenWhenTheCompanyCapabilityIsEnabled() = runTest {
        val settled = detail().copy(summary = detail().summary.copy(status = OrderStatus.SETTLED.wireValue))
        val model = OrderDetailViewModel(
            FakeRepository(OrderReadResult.Success(OrderDetailEnvelope(settled, setOf(BusinessCapability.EDIT_ORDER), "now"))),
        )

        model.open("RO-1")
        advanceUntilIdle()

        assertFalse(model.uiState.value.canEdit)
    }

    @Test
    fun keepsPrivilegedReceiptKeyInTheActiveViewModelOnly() = runTest {
        val model = OrderDetailViewModel(
            FakeRepository(
                OrderReadResult.Success(
                    OrderDetailEnvelope(
                        detail(),
                        setOf(BusinessCapability.MAINTAIN_RECEIPT),
                        "now",
                        receiptKey = "receipt-key",
                    ),
                ),
            ),
        )
        model.open("RO-1")
        advanceUntilIdle()

        assertEquals("receipt-key", model.uiState.value.receiptKey)
    }

    private class FakeRepository(private val result: OrderReadResult<OrderDetailEnvelope>) : OrderDetailRepository { override suspend fun load(orderId: String) = result }
    private companion object { fun detail() = OrderDetail(OrderSummary("RO-1", "tongda", 4, "2026-07-22", "2026-07-22", "09:30", "蒙A1", "张先生", "P7", "标的车", "在修中", 300, "记录", "2027-01-01", "明日", "now"), "150", "人保", "王", "VIN", "CL", "喷漆", "待确认", "", 100, 200, "", "", "", null, false, "", "") }
}
