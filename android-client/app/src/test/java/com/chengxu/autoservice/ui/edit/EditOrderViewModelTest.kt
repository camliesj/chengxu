package com.chengxu.autoservice.ui.edit

import com.chengxu.autoservice.core.network.ConnectionState
import com.chengxu.autoservice.core.network.NetworkMonitor
import com.chengxu.autoservice.core.orders.OrderEditRepository
import com.chengxu.autoservice.core.orders.OrderEditorData
import com.chengxu.autoservice.core.orders.model.BusinessCapability
import com.chengxu.autoservice.core.orders.model.OrderCommandResult
import com.chengxu.autoservice.core.orders.model.OrderDetail
import com.chengxu.autoservice.core.orders.model.OrderDraft
import com.chengxu.autoservice.core.orders.model.OrderSummary
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import kotlinx.coroutines.ExperimentalCoroutinesApi
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class EditOrderViewModelTest {
    private val dispatcher = StandardTestDispatcher()
    @Before fun setUp() = Dispatchers.setMain(dispatcher)
    @After fun tearDown() = Dispatchers.resetMain()

    @Test
    fun unknownSubmitKeepsOperationForExplicitConfirmationAndRebaseDoesNotSubmit() = runTest {
        val repository = FakeRepository().apply { editResult = OrderCommandResult.UnknownResult("op-1") }
        val model = EditOrderViewModel(repository, online()) { "op-1" }
        model.open("RO-1")
        advanceUntilIdle()
        model.update(EditOrderField.RECORD, "本地记录")
        model.submit()
        advanceUntilIdle()

        assertEquals(EditSubmitState.CONFIRMING, model.uiState.value.submitState)
        assertEquals("op-1", model.uiState.value.operationId)
        assertEquals(1, repository.editCalls)
    }

    @Test
    fun missingCapabilityAndOfflineNeverEmitEdit() = runTest {
        val repository = FakeRepository(capabilities = emptySet())
        val model = EditOrderViewModel(repository, offline()) { "op" }
        model.open("RO-1")
        advanceUntilIdle()
        model.submit()
        advanceUntilIdle()

        assertEquals(0, repository.editCalls)
        assertTrue(model.uiState.value.message != null)
    }

    private fun online() = object : NetworkMonitor { override val connection: StateFlow<ConnectionState> = MutableStateFlow(ConnectionState.Online) }
    private fun offline() = object : NetworkMonitor { override val connection: StateFlow<ConnectionState> = MutableStateFlow(ConnectionState.Offline) }

    private class FakeRepository(private val capabilities: Set<BusinessCapability> = setOf(BusinessCapability.EDIT_ORDER)) : OrderEditRepository {
        var editCalls = 0; var editResult: OrderCommandResult<OrderDetail> = OrderCommandResult.ServerFailure
        override suspend fun loadEditor(orderId: String) = OrderCommandResult.Success(OrderEditorData(detail(), com.chengxu.autoservice.core.orders.model.OrderCreationMetadata(1, emptySet(), com.chengxu.autoservice.core.orders.model.OrderCreationDefaults(), com.chengxu.autoservice.core.orders.model.OrderCreationOptions(), emptyMap()), capabilities, "now"))
        override fun observeDraft(orderId: String): Flow<OrderDraft?> = MutableStateFlow(null)
        override suspend fun saveDraft(orderId: String, draft: OrderDraft) = Unit
        override suspend fun deleteDraft(orderId: String) = Unit
        override suspend fun edit(orderId: String, command: com.chengxu.autoservice.core.orders.model.OrderEditCommand): OrderCommandResult<OrderDetail> { editCalls += 1; return editResult }
        override suspend fun confirm(operationId: String) = editResult
    }
    private companion object { fun detail() = OrderDetail(OrderSummary("RO-1", "tongda", 4, "2026-07-22", "2026-07-22", "09:30", "蒙A1", "张先生", "P7", "标的车", "在修中", 300, "记录", "2027-01-01", "明日", "now"), "150", "人保", "王", "VIN", "CL", "喷漆", "待确认", "", 100, 200, "", "", "", null, false, "", "") }
}
