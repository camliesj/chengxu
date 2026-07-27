package com.chengxu.autoservice.core.orders

import com.chengxu.autoservice.core.model.UserRole
import com.chengxu.autoservice.core.network.ConnectionState
import com.chengxu.autoservice.core.network.NetworkMonitor
import com.chengxu.autoservice.core.orders.model.BusinessCapability
import com.chengxu.autoservice.core.orders.model.OrderCommandResult
import com.chengxu.autoservice.core.orders.model.OrderCreateInput
import com.chengxu.autoservice.core.orders.model.OrderCreationDefaults
import com.chengxu.autoservice.core.orders.model.OrderCreationMetadata
import com.chengxu.autoservice.core.orders.model.OrderCreationMetadataEnvelope
import com.chengxu.autoservice.core.orders.model.OrderCreationOptions
import com.chengxu.autoservice.core.orders.model.OrderDetail
import com.chengxu.autoservice.core.orders.model.OrderDetailEnvelope
import com.chengxu.autoservice.core.orders.model.OrderDraft
import com.chengxu.autoservice.core.orders.model.OrderEditCommand
import com.chengxu.autoservice.core.orders.model.OrderSummary
import com.chengxu.autoservice.core.session.AppSession
import com.chengxu.autoservice.core.session.PermissionSnapshot
import com.chengxu.autoservice.core.session.SessionRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class OrderEditRepositoryTest {
    @Test
    fun successWritesDetailThenSummaryAndDeletesOnlyTheMatchingEditDraft() = runTest {
        val events = mutableListOf<String>()
        val local = FakeEditStore(events).apply { save("tongda", "RO-1", draft()) }
        val summary = FakeSummaryStore(events)
        val api = FakeEditApi(editResult = OrderCommandResult.Success(detail()))
        val repository = repository(local = local, summaries = summary, editApi = api)
        repository.loadEditor("RO-1")
        events.clear()

        assertEquals(OrderCommandResult.Success(detail()), repository.edit("RO-1", command()))
        assertEquals(listOf("detail", "summary", "delete:RO-1"), events)
        assertNull(local.observeDraft("tongda", "RO-1").first())
    }

    @Test
    fun unknownResultKeepsTheEncryptedEditDraftAndOfflineDoesNotEmitHttp() = runTest {
        val local = FakeEditStore().apply { save("tongda", "RO-1", draft()) }
        val api = FakeEditApi(editResult = OrderCommandResult.UnknownResult("op-1"))
        val repository = repository(local = local, editApi = api)
        repository.loadEditor("RO-1")

        assertEquals(OrderCommandResult.UnknownResult("op-1"), repository.edit("RO-1", command()))
        assertTrue(local.observeDraft("tongda", "RO-1").first() != null)
        assertEquals(1, api.editCalls)
    }

    @Test
    fun missingEditCapabilityRejectsBeforeMutation() = runTest {
        val api = FakeEditApi()
        val repository = repository(editApi = api, capabilities = emptySet())
        repository.loadEditor("RO-1")

        assertEquals(OrderCommandResult.Forbidden, repository.edit("RO-1", command()))
        assertEquals(0, api.editCalls)
    }

    private fun repository(
        local: FakeEditStore = FakeEditStore(), summaries: FakeSummaryStore = FakeSummaryStore(), editApi: FakeEditApi = FakeEditApi(),
        capabilities: Set<BusinessCapability> = setOf(BusinessCapability.EDIT_ORDER),
    ) = DefaultOrderEditRepository(
        sessionRepository(), monitor(), FakeReadApi(capabilities), FakeCreateApi(), editApi, local, summaries, SessionInvalidator { },
    )

    private class FakeReadApi(private val capabilities: Set<BusinessCapability>) : OrderReadApi {
        override suspend fun fetchPage(token: String, query: OrderPageQuery) = error("unused")
        override suspend fun fetchDetail(token: String, orderId: String) = OrderReadResult.Success(OrderDetailEnvelope(detail(), capabilities, "now"))
    }
    private class FakeCreateApi : OrderCreateApi {
        override suspend fun fetchMetadata(token: String) = OrderCommandResult.Success(OrderCreationMetadataEnvelope(OrderCreationMetadata(1, emptySet(), OrderCreationDefaults(), OrderCreationOptions(), emptyMap()), setOf(BusinessCapability.EDIT_ORDER), true, "now"))
        override suspend fun create(token: String, command: com.chengxu.autoservice.core.orders.model.OrderCreateCommand) = error("unused")
        override suspend fun queryOperation(token: String, operationId: String) = error("unused")
    }
    private class FakeEditApi(var editResult: OrderCommandResult<OrderDetail> = OrderCommandResult.ServerFailure) : OrderEditApi {
        var editCalls = 0
        override suspend fun edit(token: String, orderId: String, command: OrderEditCommand): OrderCommandResult<OrderDetail> { editCalls += 1; return editResult }
        override suspend fun queryOperation(token: String, operationId: String) = OrderCommandResult.ServerFailure
    }
    private class FakeEditStore(private val events: MutableList<String> = mutableListOf()) : OrderEditLocalStore {
        private val drafts = mutableMapOf<String, MutableStateFlow<OrderDraft?>>()
        override suspend fun getDetail(companyId: String, orderId: String): OrderDetail? = null
        override fun observeDraft(companyId: String, orderId: String): Flow<OrderDraft?> = drafts.getOrPut("$companyId:$orderId") { MutableStateFlow(null) }
        override suspend fun save(companyId: String, orderId: String, draft: OrderDraft) { drafts.getOrPut("$companyId:$orderId") { MutableStateFlow(null) }.value = draft }
        override suspend fun deleteDraft(companyId: String, orderId: String) { events += "delete:$orderId"; drafts.getOrPut("$companyId:$orderId") { MutableStateFlow(null) }.value = null }
        override suspend fun upsertDetail(detail: OrderDetail) { events += "detail" }
        override suspend fun deleteDetail(companyId: String, orderId: String) = Unit
    }
    private class FakeSummaryStore(private val events: MutableList<String> = mutableListOf()) : OrderCreationSummaryStore { override suspend fun upsert(summary: OrderSummary) { events += "summary" } }
    private fun sessionRepository() = object : SessionRepository { override val session: StateFlow<AppSession?> = MutableStateFlow(AppSession("tongda", "通达", "worker", "员工", "token", UserRole.EMPLOYEE, PermissionSnapshot.forRole(UserRole.EMPLOYEE))) }
    private fun monitor() = object : NetworkMonitor { override val connection: StateFlow<ConnectionState> = MutableStateFlow(ConnectionState.Online) }
    private fun draft() = OrderDraft("edit:RO-1", "tongda", "RO-1", 4, "{}", 1)
    private fun command() = OrderEditCommand("op-1", 4, OrderCreateInput("张先生", "150", "蒙A1", "P7", "VIN", "王", "2027-01-01", "人保", "标的车", "喷漆", "CL", "记录", 100, 200, "明日", ""))
    private companion object { fun detail() = OrderDetail(OrderSummary("RO-1", "tongda", 5, "2026-07-22", "2026-07-22", "09:30", "蒙A1", "张先生", "P7", "标的车", "在修中", 300, "记录", "2027-01-01", "明日", "now"), "150", "人保", "王", "VIN", "CL", "喷漆", "待确认", "", 100, 200, "", "", "", null, false, "", "") }
}
