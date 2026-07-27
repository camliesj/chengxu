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
class InsurancePoliciesRepositoryTest {
    @Test fun staleWriteKeepsCacheAndExposesConflict() = runTest {
        val cached = policy("cached", version = 2)
        val server = policy("cached", version = 3, customer = "服务器客户")
        val cache = FakeCache(mapOf("tongda" to listOf(cached)))
        val repository = InsurancePoliciesRepository(
            backgroundScope,
            FakeSessionRepository(session()),
            FakeNetworkMonitor(),
            FakeApi(
                fetchRecords = listOf(cached),
                writeResult = InsurancePolicyWriteResult.Conflict(server),
            ),
            cache,
            SessionInvalidator { },
        )

        runCurrent()
        repository.save(cached.copy(customer = "本地修改"))

        assertEquals(listOf("cached"), cache.rows("tongda").map { it.id })
        assertTrue(repository.snapshot.value.writeState is InsuranceWriteState.Conflict)
    }

    private fun session() = AppSession(
        "tongda", "通达", "worker", "员工", "token", UserRole.EMPLOYEE,
        PermissionSnapshot.forRole(UserRole.EMPLOYEE),
    )

    private fun policy(id: String, version: Int, customer: String = "张三") = InsurancePolicyRecord(
        id = id, companyId = "tongda", version = version, plate = "粤A12345", customer = customer,
        phone = "13800000000", car = "帕萨特", vin = "VIN$id", expiry = "2027-01-01",
        amount = 120000L, type = "交强险", insurer = "平安", updatedAt = "2026-07-27T00:00:00Z",
    )

    private class FakeSessionRepository(initial: AppSession?) : SessionRepository {
        override val session: StateFlow<AppSession?> = MutableStateFlow(initial)
    }

    private class FakeNetworkMonitor : NetworkMonitor {
        override val connection: StateFlow<ConnectionState> = MutableStateFlow(ConnectionState.Online)
    }

    private class FakeApi(
        private val fetchRecords: List<InsurancePolicyRecord> = emptyList(),
        private val writeResult: InsurancePolicyWriteResult,
    ) : InsurancePoliciesApi {
        override suspend fun fetch(token: String) = InsurancePoliciesResult.Success(fetchRecords)
        override suspend fun save(token: String, operationId: String, expectedVersion: Int?, policy: InsurancePolicyRecord) = writeResult
        override suspend fun delete(token: String, operationId: String, id: String, expectedVersion: Int) = InsurancePolicyWriteResult.Deleted(id)
    }

    private class FakeCache(initial: Map<String, List<InsurancePolicyRecord>>) : InsurancePolicyCache {
        private val values = initial.mapValuesTo(mutableMapOf()) { MutableStateFlow(it.value) }
        override fun observePolicies(companyId: String): Flow<List<InsurancePolicyRecord>> = values.getOrPut(companyId) { MutableStateFlow(emptyList()) }
        override suspend fun replacePolicies(companyId: String, records: List<InsurancePolicyRecord>) { values.getOrPut(companyId) { MutableStateFlow(emptyList()) }.value = records }
        override suspend fun clear() { values.values.forEach { it.value = emptyList() } }
        fun rows(companyId: String) = values[companyId]?.value.orEmpty()
    }
}
