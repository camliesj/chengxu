package com.chengxu.autoservice.core.orders

import com.chengxu.autoservice.core.model.UserRole
import com.chengxu.autoservice.core.network.ConnectionState
import com.chengxu.autoservice.core.network.NetworkMonitor
import com.chengxu.autoservice.core.session.AppSession
import com.chengxu.autoservice.core.session.PermissionSnapshot
import com.chengxu.autoservice.core.session.SessionRepository
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class CustomerVehiclesRepositoryTest {
    @Test fun offlineUsesOnlyCompanyScopedCache() = runTest {
        val cache = FakeCache(mapOf("tongda" to listOf(record("cached"))))
        val api = FakeApi()
        val repository = repository(backgroundScope, cache, api, ConnectionState.Offline)

        runCurrent()
        repository.refresh()

        assertEquals(listOf("cached"), repository.snapshot.value.records.map { it.id })
        assertEquals(0, api.calls)
    }

    @Test fun foreignResponseRetainsCacheAndDoesNotWrite() = runTest {
        val cache = FakeCache(mapOf("tongda" to listOf(record("cached"))))
        val repository = repository(
            backgroundScope, cache,
            FakeApi(CustomerVehiclesResult.Success(listOf(record("foreign", "xinqiheng")))),
        )

        runCurrent()

        assertEquals(listOf("cached"), cache.rows("tongda").map { it.id })
        assertTrue(repository.snapshot.value.syncState is OrderSyncState.Stale)
    }

    @Test fun unauthorizedClearsCacheBeforeInvalidatingSession() = runTest {
        val events = mutableListOf<String>()
        val cache = FakeCache(mapOf("tongda" to listOf(record("cached"))), events)
        val repository = repository(
            backgroundScope, cache, FakeApi(CustomerVehiclesResult.Failure(OrdersFailure.Unauthorized)),
            invalidator = SessionInvalidator { events += "invalidate" },
        )

        runCurrent()

        assertEquals(listOf("clear", "invalidate"), events)
        assertTrue(repository.snapshot.value.records.isEmpty())
    }

    private fun repository(
        scope: kotlinx.coroutines.CoroutineScope,
        cache: FakeCache,
        api: CustomerVehiclesApi,
        connection: ConnectionState = ConnectionState.Online,
        invalidator: SessionInvalidator = SessionInvalidator { },
    ) = CustomerVehiclesRepository(
        scope, FakeSessionRepository(session()), FakeNetworkMonitor(connection), api, cache, invalidator,
    )

    private fun session() = AppSession("tongda", "通达", "worker", "员工", "token", UserRole.EMPLOYEE, PermissionSnapshot.forRole(UserRole.EMPLOYEE))
    private fun record(id: String, companyId: String = "tongda") = CustomerVehicleRecord(id, companyId, "张三", "13800000000", "粤A12345", "帕萨特", "VIN$id", "平安", "轿车", "manual", "")

    private class FakeSessionRepository(initial: AppSession?) : SessionRepository {
        override val session: StateFlow<AppSession?> = MutableStateFlow(initial)
    }
    private class FakeNetworkMonitor(connection: ConnectionState) : NetworkMonitor {
        override val connection: StateFlow<ConnectionState> = MutableStateFlow(connection)
    }
    private class FakeApi(private val result: CustomerVehiclesResult = CustomerVehiclesResult.Success(emptyList())) : CustomerVehiclesApi {
        var calls = 0
        override suspend fun fetch(token: String): CustomerVehiclesResult { calls++; return result }
        override suspend fun save(token: String, record: CustomerVehicleRecord): CustomerVehicleWriteResult = CustomerVehicleWriteResult.Success(record)
    }
    private class FakeCache(
        initial: Map<String, List<CustomerVehicleRecord>> = emptyMap(),
        private val events: MutableList<String> = mutableListOf(),
    ) : CustomerVehicleCache {
        private val values = initial.mapValuesTo(mutableMapOf()) { MutableStateFlow(it.value) }
        override fun observeVehicles(companyId: String): Flow<List<CustomerVehicleRecord>> = values.getOrPut(companyId) { MutableStateFlow(emptyList()) }
        override suspend fun replaceVehicles(companyId: String, records: List<CustomerVehicleRecord>) { values.getOrPut(companyId) { MutableStateFlow(emptyList()) }.value = records }
        override suspend fun clear() { events += "clear"; values.values.forEach { it.value = emptyList() } }
        fun rows(companyId: String) = values[companyId]?.value.orEmpty()
    }
}
