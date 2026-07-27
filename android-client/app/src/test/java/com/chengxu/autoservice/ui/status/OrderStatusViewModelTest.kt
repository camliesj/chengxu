package com.chengxu.autoservice.ui.status

import com.chengxu.autoservice.core.network.ConnectionState
import com.chengxu.autoservice.core.network.NetworkMonitor
import com.chengxu.autoservice.core.orders.OrderDetailRepository
import com.chengxu.autoservice.core.orders.OrderReadResult
import com.chengxu.autoservice.core.orders.OrderStatusRepository
import com.chengxu.autoservice.core.orders.model.BusinessCapability
import com.chengxu.autoservice.core.orders.model.OrderCommandResult
import com.chengxu.autoservice.core.orders.model.OrderDetail
import com.chengxu.autoservice.core.orders.model.OrderDetailEnvelope
import com.chengxu.autoservice.core.orders.model.OrderStatus
import com.chengxu.autoservice.core.orders.model.OrderStatusCommand
import com.chengxu.autoservice.core.orders.model.OrderSummary
import com.chengxu.autoservice.core.orders.model.PendingStatusRecovery
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class OrderStatusViewModelTest {
    private val dispatcher = StandardTestDispatcher()
    @Before fun setUp() = Dispatchers.setMain(dispatcher)
    @After fun tearDown() = Dispatchers.resetMain()
    @Test
    fun submitLocksRepeatedTapsAndShowsConfirmActionForUnknownResult() = runTest {
        val repository = FakeStatusRepository(OrderCommandResult.UnknownResult("operation-1"))
        val viewModel = OrderStatusViewModel(repository, FakeDetailRepository(), monitor()) { "operation-1" }
        viewModel.open("RO-1", OrderStatus.COMPLETED)
        advanceUntilIdle()

        viewModel.submit()
        viewModel.submit()
        advanceUntilIdle()

        assertEquals(1, repository.changeCalls)
        assertEquals(StatusSubmitState.CONFIRMING, viewModel.uiState.value.submitState)
        assertEquals("operation-1", viewModel.uiState.value.operationId)
    }

    @Test
    fun successfulConfirmationReturnsTheUpdatedOrderId() = runTest {
        val repository = FakeStatusRepository(confirmResult = OrderCommandResult.Success(detail(OrderStatus.COMPLETED)))
        val viewModel = OrderStatusViewModel(repository, FakeDetailRepository(), monitor()) { "operation-1" }
        viewModel.open("RO-1", OrderStatus.COMPLETED)
        advanceUntilIdle()
        viewModel.submit()
        advanceUntilIdle()
        viewModel.confirmUnknownResult()
        advanceUntilIdle()

        assertEquals("RO-1", viewModel.uiState.value.completedOrderId)
    }

    private class FakeStatusRepository(
        private val changeResult: OrderCommandResult<OrderDetail> = OrderCommandResult.UnknownResult("operation-1"),
        private val confirmResult: OrderCommandResult<OrderDetail> = OrderCommandResult.ServerFailure,
    ) : OrderStatusRepository {
        var changeCalls = 0
        override suspend fun change(orderId: String, command: OrderStatusCommand): OrderCommandResult<OrderDetail> {
            changeCalls += 1
            return changeResult
        }
        override suspend fun confirm(operationId: String) = confirmResult
        override suspend fun restorePending(orderId: String): PendingStatusRecovery? = null
    }
    private class FakeDetailRepository : OrderDetailRepository {
        override suspend fun load(orderId: String) = OrderReadResult.Success(
            OrderDetailEnvelope(detail(), setOf(BusinessCapability.ADVANCE_ORDER_STATUS), "now"),
        )
    }
    private fun monitor() = object : NetworkMonitor {
        override val connection: StateFlow<ConnectionState> = MutableStateFlow(ConnectionState.Online)
    }
    private companion object {
        fun detail(status: OrderStatus = OrderStatus.IN_REPAIR) = OrderDetail(
            OrderSummary("RO-1", "tongda", 4, "2026-07-22", "2026-07-22", "09:30", "A-1", "Customer", "P7", "Vehicle", status.wireValue, 300, "Record", "2027-01-01", "Tomorrow", "now"),
            "150", "Insurer", "Worker", "VIN", "CL", "Accident", "Method", "Remark", 100, 200, "", "", "", null, false, "", "",
        )
    }
}
