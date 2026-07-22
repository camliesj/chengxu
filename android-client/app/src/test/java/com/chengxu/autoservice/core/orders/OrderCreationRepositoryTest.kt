package com.chengxu.autoservice.core.orders

import com.chengxu.autoservice.core.model.UserRole
import com.chengxu.autoservice.core.network.ConnectionState
import com.chengxu.autoservice.core.network.NetworkMonitor
import com.chengxu.autoservice.core.orders.model.BusinessCapability
import com.chengxu.autoservice.core.orders.model.OrderCommandResult
import com.chengxu.autoservice.core.orders.model.OrderCreateCommand
import com.chengxu.autoservice.core.orders.model.OrderCreateInput
import com.chengxu.autoservice.core.orders.model.OrderCreationDefaults
import com.chengxu.autoservice.core.orders.model.OrderCreationMetadata
import com.chengxu.autoservice.core.orders.model.OrderCreationMetadataEnvelope
import com.chengxu.autoservice.core.orders.model.OrderCreationOptions
import com.chengxu.autoservice.core.orders.model.OrderDetail
import com.chengxu.autoservice.core.orders.model.OrderDraft
import com.chengxu.autoservice.core.orders.model.OrderSummary
import com.chengxu.autoservice.core.session.AppSession
import com.chengxu.autoservice.core.session.PermissionSnapshot
import com.chengxu.autoservice.core.session.SessionRepository
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test

class OrderCreationRepositoryTest {
    @Test
    fun draftIsForcedToCurrentCompanyObservedAndDiscarded() = runTest {
        val local = FakeLocalStore()
        val repository = repository(local = local)

        assertTrue(repository.saveDraft("{\"phone\":\"150\"}", 10L))
        val saved = repository.observeDraft().first()
        assertEquals("tongda", saved?.companyId)
        assertEquals("{\"phone\":\"150\"}", saved?.payloadJson)

        repository.discardDraft()
        assertNull(repository.observeDraft().first())
    }

    @Test
    fun offlineRejectsMetadataAndCreateWithoutCallingApi() = runTest {
        val api = FakeCreateApi()
        val repository = repository(api = api, connection = ConnectionState.Offline)

        assertEquals(OrderCommandResult.NetworkUnavailable, repository.loadMetadata())
        assertEquals(OrderCommandResult.NetworkUnavailable, repository.create(command()))
        assertEquals(0, api.metadataCalls)
        assertEquals(0, api.createCalls)
    }

    @Test
    fun disabledCapabilityRejectsCreateBeforeApiMutation() = runTest {
        val api = FakeCreateApi(metadataResult = OrderCommandResult.Success(metadata(canCreate = false)))
        val repository = repository(api = api)

        assertTrue(repository.loadMetadata() is OrderCommandResult.Success)
        assertEquals(OrderCommandResult.Forbidden, repository.create(command()))
        assertEquals(0, api.createCalls)
    }

    @Test
    fun serverForbiddenRevokesTheCachedCreateCapability() = runTest {
        val api = FakeCreateApi(
            metadataResult = OrderCommandResult.Success(metadata(canCreate = true)),
            createResult = OrderCommandResult.Forbidden,
        )
        val repository = repository(api = api)
        repository.loadMetadata()

        assertEquals(OrderCommandResult.Forbidden, repository.create(command()))
        assertEquals(OrderCommandResult.Forbidden, repository.create(command()))
        assertEquals(1, api.createCalls)
    }

    @Test
    fun successWritesEncryptedDetailAndSummaryThenDeletesDraft() = runTest {
        val detail = detail()
        val local = FakeLocalStore().apply {
            replaceCreateDraft(OrderDraft("create:tongda", "tongda", null, null, "{}", 1L))
        }
        val summaries = FakeSummaryStore()
        val api = FakeCreateApi(
            metadataResult = OrderCommandResult.Success(metadata(canCreate = true)),
            createResult = OrderCommandResult.Success(detail),
        )
        val repository = repository(api = api, local = local, summaries = summaries)
        repository.loadMetadata()

        val result = repository.create(command())

        assertEquals(OrderCommandResult.Success(detail), result)
        assertEquals(listOf(detail.summary), summaries.saved)
        assertEquals(listOf(detail), local.savedDetails)
        assertNull(local.drafts["tongda"]?.value)
    }

    @Test
    fun foreignCompanySuccessIsRejectedWithoutWritingLocalState() = runTest {
        val local = FakeLocalStore()
        val summaries = FakeSummaryStore()
        val api = FakeCreateApi(
            metadataResult = OrderCommandResult.Success(metadata(canCreate = true)),
            createResult = OrderCommandResult.Success(detail(companyId = "xinqiheng")),
        )
        val repository = repository(api = api, local = local, summaries = summaries)
        repository.loadMetadata()

        assertEquals(OrderCommandResult.MalformedResponse, repository.create(command()))
        assertTrue(summaries.saved.isEmpty())
        assertTrue(local.savedDetails.isEmpty())
    }

    @Test
    fun unknownCreateKeepsDraftAndCompletedQueryPersistsOnce() = runTest {
        val local = FakeLocalStore().apply {
            replaceCreateDraft(OrderDraft("create:tongda", "tongda", null, null, "{}", 1L))
        }
        val api = FakeCreateApi(
            metadataResult = OrderCommandResult.Success(metadata(canCreate = true)),
            createResult = OrderCommandResult.UnknownResult("operation-1"),
            queryResult = OrderCommandResult.Success(detail()),
        )
        val repository = repository(api = api, local = local)
        repository.loadMetadata()

        assertEquals(OrderCommandResult.UnknownResult("operation-1"), repository.create(command()))
        assertTrue(local.drafts["tongda"]?.value != null)
        assertTrue(repository.confirm("operation-1") is OrderCommandResult.Success)
        assertNull(local.drafts["tongda"]?.value)
    }

    @Test
    fun unauthorizedClearsCapabilityAndInvalidatesSession() = runTest {
        var invalidations = 0
        val api = FakeCreateApi(metadataResult = OrderCommandResult.Unauthorized)
        val repository = repository(api = api, invalidator = SessionInvalidator { invalidations += 1 })

        assertEquals(OrderCommandResult.Unauthorized, repository.loadMetadata())
        assertEquals(1, invalidations)
        assertEquals(OrderCommandResult.Forbidden, repository.create(command()))
    }

    @Test
    fun cancellationPropagatesWithoutDeletingDraftOrInvalidatingSession() = runTest {
        val cancellation = CancellationException("cancelled")
        val local = FakeLocalStore().apply {
            replaceCreateDraft(OrderDraft("create:tongda", "tongda", null, null, "{}", 1L))
        }
        var invalidations = 0
        val api = FakeCreateApi(
            metadataResult = OrderCommandResult.Success(metadata(canCreate = true)),
            createCancellation = cancellation,
        )
        val repository = repository(
            api = api,
            local = local,
            invalidator = SessionInvalidator { invalidations += 1 },
        )
        repository.loadMetadata()

        try {
            repository.create(command())
            fail("Expected cancellation")
        } catch (caught: CancellationException) {
            assertSame(cancellation, caught)
        }
        assertTrue(local.drafts["tongda"]?.value != null)
        assertEquals(0, invalidations)
    }

    private fun repository(
        api: FakeCreateApi = FakeCreateApi(),
        local: FakeLocalStore = FakeLocalStore(),
        summaries: FakeSummaryStore = FakeSummaryStore(),
        connection: ConnectionState = ConnectionState.Online,
        invalidator: SessionInvalidator = SessionInvalidator { },
    ) = DefaultOrderCreationRepository(
        sessionRepository = FakeSessionRepository(session()),
        networkMonitor = FakeNetworkMonitor(connection),
        api = api,
        localStore = local,
        summaryStore = summaries,
        sessionInvalidator = invalidator,
    )

    private fun session() = AppSession(
        companyId = "tongda", companyName = "通达", username = "worker", staffName = "员工",
        token = "token", role = UserRole.EMPLOYEE,
        permissions = PermissionSnapshot.forRole(UserRole.EMPLOYEE),
    )

    private fun metadata(canCreate: Boolean) = OrderCreationMetadataEnvelope(
        metadata = OrderCreationMetadata(
            1, setOf("customer"), OrderCreationDefaults(), OrderCreationOptions(), emptyMap(),
        ),
        capabilities = if (canCreate) setOf(BusinessCapability.CREATE_ORDER) else emptySet(),
        canCreate = canCreate,
        serverTime = "now",
    )

    private fun command() = OrderCreateCommand(
        operationId = "11111111-1111-4111-8111-111111111111",
        order = OrderCreateInput(
            customer = "王先生", phone = "150", plate = "蒙A1", car = "P7", vin = "",
            staff = "张工", insuranceExpiry = "2027-07-21", insurer = "人保", type = "标的车",
            accidentType = "常规维修", claimNo = "", record = "维修", laborCents = 100,
            materialCents = 200, delivery = "待确认", remark = "",
        ),
    )

    private fun detail(companyId: String = "tongda") = OrderDetail(
        summary = OrderSummary(
            id = "RO20260700001", companyId = companyId, version = 1, date = "2026-07-22",
            dateSortKey = "2026-07-22", time = "09:30", plate = "蒙A1", customer = "王先生",
            car = "P7", type = "标的车", status = "在修中", amountCents = 300,
            record = "维修", insuranceExpiry = "2027-07-21", delivery = "待确认", updatedAt = "now",
        ),
        phone = "150", insurer = "人保", staff = "张工", vin = "", claimNo = "",
        accidentType = "常规维修", paymentMethod = "待确认", remark = "", laborCents = 100,
        materialCents = 200, settlementDate = "", settlementTime = "", settlementRemark = "",
        receipt = null, voided = false, voidedAt = "", voidReason = "",
    )

    private class FakeSessionRepository(initial: AppSession?) : SessionRepository {
        override val session: StateFlow<AppSession?> = MutableStateFlow(initial)
    }

    private class FakeNetworkMonitor(initial: ConnectionState) : NetworkMonitor {
        override val connection: StateFlow<ConnectionState> = MutableStateFlow(initial)
    }

    private class FakeCreateApi(
        var metadataResult: OrderCommandResult<OrderCreationMetadataEnvelope> = OrderCommandResult.Success(metadata(true)),
        var createResult: OrderCommandResult<OrderDetail> = OrderCommandResult.ServerFailure,
        var queryResult: OrderCommandResult<OrderDetail> = OrderCommandResult.ServerFailure,
        val createCancellation: CancellationException? = null,
    ) : OrderCreateApi {
        var metadataCalls = 0
        var createCalls = 0

        override suspend fun fetchMetadata(token: String): OrderCommandResult<OrderCreationMetadataEnvelope> {
            metadataCalls += 1
            return metadataResult
        }

        override suspend fun create(token: String, command: OrderCreateCommand): OrderCommandResult<OrderDetail> {
            createCalls += 1
            createCancellation?.let { throw it }
            return createResult
        }

        override suspend fun queryOperation(token: String, operationId: String): OrderCommandResult<OrderDetail> =
            queryResult
    }

    private class FakeLocalStore : OrderCreationLocalStore {
        val drafts = mutableMapOf<String, MutableStateFlow<OrderDraft?>>()
        val savedDetails = mutableListOf<OrderDetail>()

        override fun observeCreateDraft(companyId: String): Flow<OrderDraft?> =
            drafts.getOrPut(companyId) { MutableStateFlow(null) }

        override suspend fun getLatestCreateDraft(companyId: String): OrderDraft? =
            drafts.getOrPut(companyId) { MutableStateFlow(null) }.value

        override suspend fun replaceCreateDraft(draft: OrderDraft) {
            drafts.getOrPut(draft.companyId) { MutableStateFlow(null) }.value = draft
        }

        override suspend fun deleteCreateDraft(companyId: String) {
            drafts.getOrPut(companyId) { MutableStateFlow(null) }.value = null
        }

        override suspend fun upsertDetail(detail: OrderDetail) {
            savedDetails += detail
        }
    }

    private class FakeSummaryStore : OrderCreationSummaryStore {
        val saved = mutableListOf<OrderSummary>()
        override suspend fun upsert(summary: OrderSummary) { saved += summary }
    }

    private companion object {
        fun metadata(canCreate: Boolean) = OrderCreationMetadataEnvelope(
            metadata = OrderCreationMetadata(1, setOf("customer"), OrderCreationDefaults(), OrderCreationOptions(), emptyMap()),
            capabilities = if (canCreate) setOf(BusinessCapability.CREATE_ORDER) else emptySet(),
            canCreate = canCreate,
            serverTime = "now",
        )
    }
}
