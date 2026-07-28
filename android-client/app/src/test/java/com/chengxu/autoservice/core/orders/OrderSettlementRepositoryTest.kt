package com.chengxu.autoservice.core.orders

import com.chengxu.autoservice.core.model.UserRole
import com.chengxu.autoservice.core.network.ConnectionState
import com.chengxu.autoservice.core.network.NetworkMonitor
import com.chengxu.autoservice.core.orders.model.BusinessCapability
import com.chengxu.autoservice.core.orders.model.OrderCommandResult
import com.chengxu.autoservice.core.orders.model.OrderDetail
import com.chengxu.autoservice.core.orders.model.OrderDetailEnvelope
import com.chengxu.autoservice.core.orders.model.OrderStatus
import com.chengxu.autoservice.core.orders.model.OrderSummary
import com.chengxu.autoservice.core.orders.model.ReceiptMetadata
import com.chengxu.autoservice.core.orders.model.SettlementCommand
import com.chengxu.autoservice.core.session.AppSession
import com.chengxu.autoservice.core.session.PermissionSnapshot
import com.chengxu.autoservice.core.session.SessionRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class OrderSettlementRepositoryTest {
    @Test fun offlineSettlementDoesNotCallHttp() = runTest {
        val api = FakeApi()
        val repository = repository(api, ConnectionState.Offline)
        assertEquals(OrderCommandResult.NetworkUnavailable, repository.settle("RO-1", command()))
        assertEquals(0, api.settleCalls)
    }

    @Test fun settlementRequiresBothCapabilitiesAndPersistsServerDetail() = runTest {
        val api = FakeApi(OrderCommandResult.Success(detail(OrderStatus.SETTLED)))
        val denied = repository(api, capabilities = setOf(BusinessCapability.SETTLE_ORDER))
        assertEquals(OrderCommandResult.Forbidden, denied.settle("RO-1", command()))
        assertEquals(0, api.settleCalls)

        val store = FakeStore()
        val allowed = repository(api, store = store, capabilities = setOf(BusinessCapability.SETTLE_ORDER, BusinessCapability.MAINTAIN_RECEIPT))
        assertTrue(allowed.settle("RO-1", command()) is OrderCommandResult.Success<*>)
        assertEquals(1, api.settleCalls)
        assertEquals("已结算", store.detail?.summary?.status)
    }

    private fun repository(api: FakeApi, connection: ConnectionState = ConnectionState.Online, store: FakeStore = FakeStore(), capabilities: Set<BusinessCapability> = setOf(BusinessCapability.SETTLE_ORDER, BusinessCapability.MAINTAIN_RECEIPT)) = DefaultOrderSettlementRepository(sessionRepository(), monitor(connection), FakeReadApi(capabilities), api, store, FakeSummaryStore(), SessionInvalidator { })
    private class FakeApi(private val settleResult: OrderCommandResult<OrderDetail> = OrderCommandResult.ServerFailure) : OrderSettlementApi {
        var settleCalls = 0
        override suspend fun settle(token: String, orderId: String, command: SettlementCommand): OrderCommandResult<OrderDetail> { settleCalls++; return settleResult }
        override suspend fun reverse(token: String, orderId: String, operationId: String, expectedVersion: Long) = OrderCommandResult.ServerFailure
        override suspend fun updateReceipt(token: String, orderId: String, operationId: String, expectedVersion: Long, receipt: ReceiptMetadata?) = OrderCommandResult.ServerFailure
    }
    private class FakeReadApi(private val capabilities: Set<BusinessCapability>) : OrderReadApi {
        override suspend fun fetchPage(token: String, query: OrderPageQuery) = error("unused")
        override suspend fun fetchDetail(token: String, orderId: String) = OrderReadResult.Success(OrderDetailEnvelope(detail(), capabilities, "now"))
    }
    private class FakeStore : OrderSettlementLocalStore { var detail: OrderDetail? = null; override suspend fun getDetail(companyId: String, orderId: String) = detail; override suspend fun upsertDetail(detail: OrderDetail) { this.detail = detail }; override suspend fun deleteDetail(companyId: String, orderId: String) { detail = null } }
    private class FakeSummaryStore : OrderCreationSummaryStore { override suspend fun upsert(summary: OrderSummary) = Unit }
    private fun sessionRepository() = object : SessionRepository { override val session: StateFlow<AppSession?> = MutableStateFlow(AppSession("tongda", "Tongda", "manager", "Manager", "token", UserRole.ADMINISTRATOR, PermissionSnapshot.forRole(UserRole.ADMINISTRATOR))) }
    private fun monitor(state: ConnectionState) = object : NetworkMonitor { override val connection: StateFlow<ConnectionState> = MutableStateFlow(state) }
    private fun command() = SettlementCommand("settle-op", 4, "现金", "2026-07-28", "10:30", "到账", ReceiptMetadata("key", "receipt.png", "image/png", 128, "now"))
    private companion object {
        fun detail(status: OrderStatus = OrderStatus.PENDING_SETTLEMENT) = OrderDetail(OrderSummary("RO-1", "tongda", 4, "2026-07-28", "2026-07-28", "10:00", "A-1", "Customer", "Car", "Type", status.wireValue, 300, "Record", "2027-01-01", "Tomorrow", "now"), "", "", "", "", "", "", "", "", 100, 200, "", "", "", null, false, "", "")
    }
}
