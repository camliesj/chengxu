package com.chengxu.autoservice.core.orders

import com.chengxu.autoservice.core.model.UserRole
import com.chengxu.autoservice.core.network.ConnectionState
import com.chengxu.autoservice.core.network.NetworkMonitor
import com.chengxu.autoservice.core.orders.model.BusinessCapability
import com.chengxu.autoservice.core.orders.model.OrderCommandResult
import com.chengxu.autoservice.core.orders.model.OrderDetail
import com.chengxu.autoservice.core.orders.model.OrderDetailEnvelope
import com.chengxu.autoservice.core.orders.model.OrderStatus
import com.chengxu.autoservice.core.orders.model.OrderStatusCommand
import com.chengxu.autoservice.core.orders.model.OrderSummary
import com.chengxu.autoservice.core.orders.model.PendingStatusEnvelope
import com.chengxu.autoservice.core.session.AppSession
import com.chengxu.autoservice.core.session.PermissionSnapshot
import com.chengxu.autoservice.core.session.SessionRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class OrderStatusRepositoryTest {
    @Test
    fun successPersistsDetailAndSummaryThenDeletesPendingEnvelope() = runTest {
        val events = mutableListOf<String>()
        val store = FakeStatusStore(events).apply { savePending("tongda", envelope()) }
        val summaries = FakeSummaryStore(events)
        val repository = repository(store = store, summaries = summaries, api = FakeStatusApi(OrderCommandResult.Success(detail(status = OrderStatus.COMPLETED))))

        assertEquals(OrderCommandResult.Success(detail(status = OrderStatus.COMPLETED)), repository.change("RO-1", command()))

        assertEquals(listOf("detail", "detail", "summary", "delete:RO-1"), events)
        assertNull(store.getPendingStatus("tongda", "RO-1"))
    }

    @Test
    fun unknownResultSavesEncryptedPendingEnvelopeForTheOriginalOperation() = runTest {
        val store = FakeStatusStore()
        val repository = repository(store = store, api = FakeStatusApi(OrderCommandResult.UnknownResult("op-1")))

        assertEquals(OrderCommandResult.UnknownResult("op-1"), repository.change("RO-1", command()))

        val pending = store.getPendingStatus("tongda", "RO-1")
        assertEquals("RO-1", pending?.orderId)
        assertEquals("op-1", pending?.operationId)
        assertEquals(4L, pending?.expectedVersion)
        assertEquals(OrderStatus.COMPLETED.wireValue, pending?.targetStatus)
        assertTrue((pending?.createdAtMillis ?: 0) > 0)
    }

    @Test
    fun offlineDoesNotEmitHttpOrSaveAnEnvelope() = runTest {
        val store = FakeStatusStore()
        val api = FakeStatusApi(OrderCommandResult.Success(detail()))
        val repository = repository(store = store, api = api, connection = ConnectionState.Offline)

        assertEquals(OrderCommandResult.NetworkUnavailable, repository.change("RO-1", command()))
        assertEquals(0, api.changeCalls)
        assertNull(store.getPendingStatus("tongda", "RO-1"))
    }

    @Test
    fun missingCapabilityRejectsBeforeStatusMutation() = runTest {
        val api = FakeStatusApi(OrderCommandResult.Success(detail()))
        val repository = repository(api = api, capabilities = emptySet())

        assertEquals(OrderCommandResult.Forbidden, repository.change("RO-1", command()))
        assertEquals(0, api.changeCalls)
    }

    @Test
    fun restoreQueriesTheOriginalOperationAndNeverReplaysTheChange() = runTest {
        val store = FakeStatusStore().apply { savePending("tongda", envelope()) }
        val api = FakeStatusApi(queryResult = OrderCommandResult.Success(detail(status = OrderStatus.COMPLETED)))
        val repository = repository(store = store, api = api)

        val recovery = repository.restorePending("RO-1")

        assertEquals("op-1", api.queriedOperationId)
        assertEquals(0, api.changeCalls)
        assertEquals(OrderCommandResult.Success(detail(status = OrderStatus.COMPLETED)), recovery?.result)
        assertNull(store.getPendingStatus("tongda", "RO-1"))
    }

    private fun repository(
        store: FakeStatusStore = FakeStatusStore(),
        summaries: FakeSummaryStore = FakeSummaryStore(),
        api: FakeStatusApi = FakeStatusApi(),
        capabilities: Set<BusinessCapability> = setOf(BusinessCapability.ADVANCE_ORDER_STATUS),
        connection: ConnectionState = ConnectionState.Online,
    ) = DefaultOrderStatusRepository(
        sessionRepository(), monitor(connection), FakeReadApi(capabilities), api, store, summaries, SessionInvalidator { },
    )

    private class FakeReadApi(private val capabilities: Set<BusinessCapability>) : OrderReadApi {
        override suspend fun fetchPage(token: String, query: OrderPageQuery) = error("unused")
        override suspend fun fetchDetail(token: String, orderId: String) =
            OrderReadResult.Success(OrderDetailEnvelope(detail(), capabilities, "now"))
    }

    private class FakeStatusApi(
        private val changeResult: OrderCommandResult<OrderDetail> = OrderCommandResult.ServerFailure,
        private val queryResult: OrderCommandResult<OrderDetail> = OrderCommandResult.ServerFailure,
    ) : OrderStatusApi {
        var changeCalls = 0
        var queriedOperationId: String? = null
        override suspend fun change(token: String, orderId: String, command: OrderStatusCommand): OrderCommandResult<OrderDetail> {
            changeCalls += 1
            return changeResult
        }
        override suspend fun queryOperation(token: String, operationId: String): OrderCommandResult<OrderDetail> {
            queriedOperationId = operationId
            return queryResult
        }
    }

    private class FakeStatusStore(private val events: MutableList<String> = mutableListOf()) : OrderStatusLocalStore {
        private val pending = mutableMapOf<String, PendingStatusEnvelope>()
        override suspend fun getDetail(companyId: String, orderId: String): OrderDetail? = null
        override suspend fun upsertDetail(detail: OrderDetail) { events += "detail" }
        override suspend fun deleteDetail(companyId: String, orderId: String) = Unit
        override suspend fun getPendingStatus(companyId: String, orderId: String) = pending["$companyId:$orderId"]
        override suspend fun savePending(companyId: String, envelope: PendingStatusEnvelope) { pending["$companyId:${envelope.orderId}"] = envelope }
        override suspend fun deletePendingStatus(companyId: String, orderId: String) { events += "delete:$orderId"; pending.remove("$companyId:$orderId") }
    }

    private class FakeSummaryStore(private val events: MutableList<String> = mutableListOf()) : OrderCreationSummaryStore {
        override suspend fun upsert(summary: OrderSummary) { events += "summary" }
    }

    private fun sessionRepository() = object : SessionRepository {
        override val session: StateFlow<AppSession?> = MutableStateFlow(
            AppSession("tongda", "Tongda", "worker", "Employee", "token", UserRole.EMPLOYEE, PermissionSnapshot.forRole(UserRole.EMPLOYEE)),
        )
    }
    private fun monitor(connection: ConnectionState) = object : NetworkMonitor {
        override val connection: StateFlow<ConnectionState> = MutableStateFlow(connection)
    }
    private fun command() = OrderStatusCommand("op-1", 4, OrderStatus.COMPLETED)
    private fun envelope() = PendingStatusEnvelope("RO-1", "op-1", 4, OrderStatus.COMPLETED.wireValue, 1)

    private companion object {
        fun detail(status: OrderStatus = OrderStatus.IN_REPAIR) = OrderDetail(
            summary = OrderSummary("RO-1", "tongda", 4, "2026-07-22", "2026-07-22", "09:30", "A-1", "Customer", "P7", "Vehicle", status.wireValue, 300, "Record", "2027-01-01", "Tomorrow", "now"),
            phone = "150", insurer = "Insurer", staff = "Worker", vin = "VIN", claimNo = "CL", accidentType = "Accident", paymentMethod = "Method", remark = "Remark", laborCents = 100, materialCents = 200,
            settlementDate = "", settlementTime = "", settlementRemark = "", receipt = null, voided = false, voidedAt = "", voidReason = "",
        )
    }
}
