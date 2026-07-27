package com.chengxu.autoservice.core.orders

import com.chengxu.autoservice.core.model.UserRole
import com.chengxu.autoservice.core.network.ConnectionState
import com.chengxu.autoservice.core.network.NetworkMonitor
import com.chengxu.autoservice.core.orders.model.OrderDetail
import com.chengxu.autoservice.core.orders.model.OrderDetailEnvelope
import com.chengxu.autoservice.core.orders.model.OrderSummary
import com.chengxu.autoservice.core.session.AppSession
import com.chengxu.autoservice.core.session.PermissionSnapshot
import com.chengxu.autoservice.core.session.SessionRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class OrderDetailRepositoryTest {
    @Test
    fun offlineUsesTheCurrentCompanyCachedDetailWithoutCallingTheNetwork() = runTest {
        val local = FakeDetails().apply { details["tongda:RO-1"] = detail() }
        val api = FakeReadApi()
        val repository = DefaultOrderDetailRepository(sessionRepository(), monitor(ConnectionState.Offline), api, local, SessionInvalidator { })

        val result = repository.load("RO-1") as OrderReadResult.Success<*>

        assertEquals(detail(), (result.value as OrderDetailEnvelope).order)
        assertEquals(0, api.calls)
    }

    @Test
    fun onlineRefreshPersistsOnlyMatchingCompanyAndNotFoundRemovesCache() = runTest {
        val local = FakeDetails().apply { details["tongda:RO-1"] = detail() }
        val api = FakeReadApi(result = OrderReadResult.Failure(OrderReadFailure.NotFound))
        val repository = DefaultOrderDetailRepository(sessionRepository(), monitor(ConnectionState.Online), api, local, SessionInvalidator { })

        assertEquals(OrderReadResult.Failure(OrderReadFailure.NotFound), repository.load("RO-1"))
        assertTrue(local.details.isEmpty())
    }

    @Test
    fun unauthorizedInvalidatesTheSharedSession() = runTest {
        var invalidations = 0
        val repository = DefaultOrderDetailRepository(
            sessionRepository(), monitor(ConnectionState.Online),
            FakeReadApi(result = OrderReadResult.Failure(OrderReadFailure.Unauthorized)), FakeDetails(),
            SessionInvalidator { invalidations += 1 },
        )

        assertEquals(OrderReadResult.Failure(OrderReadFailure.Unauthorized), repository.load("RO-1"))
        assertEquals(1, invalidations)
    }

    private class FakeReadApi(var result: OrderReadResult<OrderDetailEnvelope> = OrderReadResult.Success(OrderDetailEnvelope(detail(), emptySet(), "now"))) : OrderReadApi {
        var calls = 0
        override suspend fun fetchPage(token: String, query: OrderPageQuery) = error("unused")
        override suspend fun fetchDetail(token: String, orderId: String): OrderReadResult<OrderDetailEnvelope> { calls += 1; return result }
    }

    private class FakeDetails : OrderDetailLocalStore {
        val details = mutableMapOf<String, OrderDetail>()
        override suspend fun getDetail(companyId: String, orderId: String) = details["$companyId:$orderId"]
        override suspend fun upsertDetail(detail: OrderDetail) { details["${detail.summary.companyId}:${detail.summary.id}"] = detail }
        override suspend fun deleteDetail(companyId: String, orderId: String) { details.remove("$companyId:$orderId") }
    }

    private fun sessionRepository() = object : SessionRepository { override val session: StateFlow<AppSession?> = MutableStateFlow(session()) }
    private fun monitor(state: ConnectionState) = object : NetworkMonitor { override val connection: StateFlow<ConnectionState> = MutableStateFlow(state) }
    private fun session() = AppSession("tongda", "通达", "worker", "员工", "token", UserRole.EMPLOYEE, PermissionSnapshot.forRole(UserRole.EMPLOYEE))

    private companion object {
        fun detail() = OrderDetail(
            OrderSummary("RO-1", "tongda", 4, "2026-07-22", "2026-07-22", "09:30", "蒙A1", "张先生", "P7", "标的车", "在修中", 300, "记录", "2027-01-01", "明日", "now"),
            "150", "人保", "王师傅", "VIN", "CL", "喷漆", "待确认", "备注", 100, 200, "", "", "", null, false, "", "",
        )
    }
}
