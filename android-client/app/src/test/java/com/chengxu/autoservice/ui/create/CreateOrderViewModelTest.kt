package com.chengxu.autoservice.ui.create

import com.chengxu.autoservice.core.network.ConnectionState
import com.chengxu.autoservice.core.network.NetworkMonitor
import com.chengxu.autoservice.core.orders.OrderCreationRepository
import com.chengxu.autoservice.core.orders.model.BusinessCapability
import com.chengxu.autoservice.core.orders.model.OrderCommandResult
import com.chengxu.autoservice.core.orders.model.OrderCreateCommand
import com.chengxu.autoservice.core.orders.model.OrderCreationDefaults
import com.chengxu.autoservice.core.orders.model.OrderCreationMetadata
import com.chengxu.autoservice.core.orders.model.OrderCreationMetadataEnvelope
import com.chengxu.autoservice.core.orders.model.OrderCreationOptions
import com.chengxu.autoservice.core.orders.model.OrderDetail
import com.chengxu.autoservice.core.orders.model.OrderDraft
import com.chengxu.autoservice.core.orders.model.OrderSummary
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class CreateOrderViewModelTest {
    private val dispatcher = UnconfinedTestDispatcher()

    @Before fun setUp() = Dispatchers.setMain(dispatcher)
    @After fun tearDown() = Dispatchers.resetMain()

    @Test
    fun metadataDefaultsAndEncryptedDraftRestoreIntoFourStepState() = runTest {
        val repository = FakeRepository(
            draft = OrderDraft(
                "create:tongda", "tongda", null, null,
                """{"step":2,"fields":{"customer":"草稿客户","plate":"蒙A88888"}}""",
                10L,
            ),
        )
        val viewModel = viewModel(repository)
        advanceUntilIdle()

        assertFalse(viewModel.uiState.value.loading)
        assertEquals(CreateOrderStep.REPAIR, viewModel.uiState.value.step)
        assertEquals("草稿客户", viewModel.uiState.value.fields.customer)
        assertEquals("蒙A88888", viewModel.uiState.value.fields.plate)
        assertEquals("人保财险", viewModel.uiState.value.fields.insurer)
        assertTrue(viewModel.uiState.value.canCreate)
    }

    @Test
    fun nextValidatesOnlyCurrentStepAndMoneyWithoutRounding() = runTest {
        val viewModel = viewModel(FakeRepository())
        advanceUntilIdle()

        viewModel.next()
        assertEquals(CreateOrderStep.CUSTOMER, viewModel.uiState.value.step)
        assertEquals("order.customer.required", viewModel.uiState.value.fieldErrors[CreateOrderField.CUSTOMER])

        fillCustomer(viewModel)
        viewModel.next()
        viewModel.update(CreateOrderField.INSURANCE_EXPIRY, "2027-07-22")
        viewModel.next()
        viewModel.update(CreateOrderField.RECORD, "维修")
        viewModel.update(CreateOrderField.LABOR, "1.005")
        viewModel.next()

        assertEquals(CreateOrderStep.REPAIR, viewModel.uiState.value.step)
        assertEquals("order.laborCents.max_two_decimals", viewModel.uiState.value.fieldErrors[CreateOrderField.LABOR])
    }

    @Test
    fun editsDebounceToOneDraftAndExplicitExitActionsAreDeterministic() = runTest {
        val repository = FakeRepository()
        val viewModel = viewModel(repository)
        advanceUntilIdle()

        viewModel.update(CreateOrderField.CUSTOMER, "王")
        viewModel.update(CreateOrderField.CUSTOMER, "王先生")
        advanceUntilIdle()
        assertEquals(1, repository.savedDrafts.size)
        assertTrue(repository.savedDrafts.single().contains("王先生"))

        viewModel.requestExit()
        assertTrue(viewModel.uiState.value.showLeaveConfirmation)
        viewModel.continueEditing()
        assertFalse(viewModel.uiState.value.showLeaveConfirmation)
        viewModel.discardAndExit()
        advanceUntilIdle()
        assertEquals(1, repository.discardCalls)
        assertEquals(CreateOrderEvent.Exit, viewModel.events.first())
    }

    @Test
    fun explicitSaveCancelsTheDebounceAndKeepsTheDraftOpen() = runTest {
        val repository = FakeRepository()
        val viewModel = viewModel(repository)
        advanceUntilIdle()

        viewModel.update(CreateOrderField.CUSTOMER, "王先生")
        viewModel.saveDraft()
        advanceUntilIdle()

        assertEquals(1, repository.savedDrafts.size)
        assertTrue(repository.savedDrafts.single().contains("王先生"))
        assertTrue(viewModel.uiState.value.dirty)
        assertEquals("草稿已加密保存在本机", viewModel.uiState.value.message)
    }

    @Test
    fun offlineAndDisabledCapabilityNeverSubmit() = runTest {
        val offlineRepository = FakeRepository()
        val offlineNetwork = FakeNetworkMonitor(ConnectionState.Offline)
        val offline = viewModel(offlineRepository, offlineNetwork)
        advanceUntilIdle()
        offline.submit()
        assertEquals(0, offlineRepository.createCalls)
        assertEquals("网络不可用，联网后才能提交", offline.uiState.value.message)

        val disabledRepository = FakeRepository(
            metadataResult = OrderCommandResult.Success(metadata(canCreate = false)),
        )
        val disabled = viewModel(disabledRepository)
        advanceUntilIdle()
        disabled.submit()
        assertEquals(0, disabledRepository.createCalls)
        assertFalse(disabled.uiState.value.canCreate)
    }

    @Test
    fun metadataRetriesWhenAnOfflineSessionReturnsOnline() = runTest {
        val repository = FakeRepository(metadataResult = OrderCommandResult.NetworkUnavailable)
        val network = FakeNetworkMonitor(ConnectionState.Offline)
        val viewModel = viewModel(repository, network)
        advanceUntilIdle()
        assertFalse(viewModel.uiState.value.canCreate)

        repository.metadataResult = OrderCommandResult.Success(metadata(canCreate = true))
        network.update(ConnectionState.Online)
        advanceUntilIdle()

        assertTrue(viewModel.uiState.value.canCreate)
        assertNotNull(viewModel.uiState.value.metadata)
    }

    @Test
    fun duplicateSubmitIsLockedAndUnknownResultUsesSameOperationUntilSuccess() = runTest {
        val repository = FakeRepository(createDeferred = CompletableDeferred())
        val viewModel = viewModel(repository)
        advanceUntilIdle()
        fillAll(viewModel)
        advanceUntilIdle()
        repository.savedDrafts.clear()
        viewModel.submit()
        viewModel.submit()
        assertEquals(1, repository.createCalls)
        assertTrue(viewModel.uiState.value.submitting)

        repository.createDeferred?.complete(OrderCommandResult.UnknownResult("operation-fixed"))
        advanceUntilIdle()
        assertEquals("operation-fixed", viewModel.uiState.value.unknownOperationId)
        assertFalse(viewModel.uiState.value.submitting)
        assertTrue(repository.savedDrafts.last().contains("\"operationId\":\"operation-fixed\""))

        val restored = viewModel(
            FakeRepository(
                draft = OrderDraft(
                    "create:tongda", "tongda", null, null,
                    repository.savedDrafts.last(), 101L,
                ),
            ),
        )
        advanceUntilIdle()
        assertEquals("operation-fixed", restored.uiState.value.unknownOperationId)

        repository.queryResult = OrderCommandResult.Success(detail())
        viewModel.confirmUnknownResult()
        advanceUntilIdle()
        assertEquals("operation-fixed", repository.lastQueryOperationId)
        assertEquals(CreateOrderEvent.Created("RO20260700001"), viewModel.events.first())
        assertEquals(CreateOrderStep.CUSTOMER, viewModel.uiState.value.step)
        assertEquals("", viewModel.uiState.value.fields.customer)
        assertEquals("人保财险", viewModel.uiState.value.fields.insurer)
        assertFalse(viewModel.uiState.value.dirty)
    }

    @Test
    fun serverFieldErrorsMapIntegerCentKeysToVisibleInputs() = runTest {
        val repository = FakeRepository(
            createResult = OrderCommandResult.ValidationFailure(
                mapOf("laborCents" to "order.laborCents.non_negative_integer"),
            ),
        )
        val viewModel = viewModel(repository)
        advanceUntilIdle()
        fillAll(viewModel)
        viewModel.submit()
        advanceUntilIdle()

        assertEquals(
            "order.laborCents.non_negative_integer",
            viewModel.uiState.value.fieldErrors[CreateOrderField.LABOR],
        )
        assertNull(viewModel.uiState.value.unknownOperationId)
    }

    @Test
    fun postDispatchTransportFailuresEnterConfirmationWithTheSameOperation() = runTest {
        for (result in listOf(
            OrderCommandResult.NetworkUnavailable,
            OrderCommandResult.ServerFailure,
            OrderCommandResult.MalformedResponse,
        )) {
            val repository = FakeRepository(createResult = result)
            val viewModel = viewModel(repository)
            advanceUntilIdle()
            fillAll(viewModel)
            viewModel.submit()
            advanceUntilIdle()

            assertEquals("operation-fixed", viewModel.uiState.value.unknownOperationId)
            assertTrue(repository.savedDrafts.last().contains("\"operationId\":\"operation-fixed\""))
        }
    }

    @Test
    fun serverForbiddenDisablesFurtherCreationButKeepsTheDraft() = runTest {
        val repository = FakeRepository(createResult = OrderCommandResult.Forbidden)
        val viewModel = viewModel(repository)
        advanceUntilIdle()
        fillAll(viewModel)
        viewModel.submit()
        advanceUntilIdle()

        assertFalse(viewModel.uiState.value.canCreate)
        assertTrue(viewModel.uiState.value.dirty)
        assertEquals("当前账号或企业未启用新增工单权限", viewModel.uiState.value.message)
    }

    private fun viewModel(
        repository: FakeRepository,
        network: FakeNetworkMonitor = FakeNetworkMonitor(ConnectionState.Online),
    ) = CreateOrderViewModel(
        repository = repository,
        networkMonitor = network,
        operationIdFactory = { "operation-fixed" },
        nowMillis = { 100L },
        draftDebounceMillis = 1L,
    )

    private fun fillCustomer(viewModel: CreateOrderViewModel) {
        viewModel.update(CreateOrderField.CUSTOMER, "王先生")
        viewModel.update(CreateOrderField.PHONE, "15000000000")
        viewModel.update(CreateOrderField.PLATE, "蒙A12345")
        viewModel.update(CreateOrderField.CAR, "P7")
    }

    private fun fillAll(viewModel: CreateOrderViewModel) {
        fillCustomer(viewModel)
        viewModel.update(CreateOrderField.INSURANCE_EXPIRY, "2027-07-22")
        viewModel.update(CreateOrderField.RECORD, "维修")
        viewModel.update(CreateOrderField.LABOR, "100")
        viewModel.update(CreateOrderField.MATERIAL, "200")
    }

    private class FakeNetworkMonitor(initial: ConnectionState) : NetworkMonitor {
        private val mutableConnection = MutableStateFlow(initial)
        override val connection: StateFlow<ConnectionState> = mutableConnection
        fun update(value: ConnectionState) { mutableConnection.value = value }
    }

    private class FakeRepository(
        draft: OrderDraft? = null,
        var metadataResult: OrderCommandResult<OrderCreationMetadataEnvelope> = OrderCommandResult.Success(metadata(true)),
        var createResult: OrderCommandResult<OrderDetail> = OrderCommandResult.ServerFailure,
        var queryResult: OrderCommandResult<OrderDetail> = OrderCommandResult.ServerFailure,
        val createDeferred: CompletableDeferred<OrderCommandResult<OrderDetail>>? = null,
    ) : OrderCreationRepository {
        private val draftFlow = MutableStateFlow(draft)
        val savedDrafts = mutableListOf<String>()
        var discardCalls = 0
        var createCalls = 0
        var lastQueryOperationId: String? = null

        override fun observeDraft(): Flow<OrderDraft?> = draftFlow
        override suspend fun loadMetadata(): OrderCommandResult<OrderCreationMetadataEnvelope> = metadataResult
        override suspend fun saveDraft(payloadJson: String, updatedAtMillis: Long): Boolean {
            savedDrafts += payloadJson
            return true
        }
        override suspend fun discardDraft() { discardCalls += 1; draftFlow.value = null }
        override suspend fun create(command: OrderCreateCommand): OrderCommandResult<OrderDetail> {
            createCalls += 1
            return createDeferred?.await() ?: createResult
        }
        override suspend fun confirm(operationId: String): OrderCommandResult<OrderDetail> {
            lastQueryOperationId = operationId
            return queryResult
        }
    }

    private companion object {
        fun metadata(canCreate: Boolean) = OrderCreationMetadataEnvelope(
            metadata = OrderCreationMetadata(
                contractVersion = 1,
                requiredFields = setOf("customer", "phone", "plate", "car", "insuranceExpiry", "record"),
                defaults = OrderCreationDefaults(
                    insurer = "人保财险", staff = "张工", type = "标的车",
                    accidentType = "常规维修", delivery = "待确认",
                ),
                options = OrderCreationOptions(
                    insurers = listOf("人保财险"), vehicleTypes = listOf("标的车"),
                    accidentTypes = listOf("常规维修"), deliverySuggestions = listOf("待确认"),
                ),
                maxLengths = emptyMap(),
            ),
            capabilities = if (canCreate) setOf(BusinessCapability.CREATE_ORDER) else emptySet(),
            canCreate = canCreate,
            serverTime = "now",
        )

        fun detail() = OrderDetail(
            summary = OrderSummary(
                "RO20260700001", "tongda", 1, "2026-07-22", "2026-07-22", "09:30",
                "蒙A12345", "王先生", "P7", "标的车", "在修中", 30_000, "维修",
                "2027-07-22", "待确认", "now",
            ),
            phone = "150", insurer = "人保财险", staff = "张工", vin = "", claimNo = "",
            accidentType = "常规维修", paymentMethod = "待确认", remark = "", laborCents = 10_000,
            materialCents = 20_000, settlementDate = "", settlementTime = "", settlementRemark = "",
            receipt = null, voided = false, voidedAt = "", voidReason = "",
        )
    }
}
