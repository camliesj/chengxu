package com.chengxu.autoservice.ui.create

import com.chengxu.autoservice.core.orders.CustomerVehicleRecord
import com.chengxu.autoservice.core.orders.CustomerVehiclesDataSource
import com.chengxu.autoservice.core.orders.CustomerVehiclesSnapshot
import com.chengxu.autoservice.core.orders.InsurancePoliciesDataSource
import com.chengxu.autoservice.core.orders.InsurancePoliciesSnapshot
import com.chengxu.autoservice.core.orders.InsurancePolicyRecord
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Test

class CreateOrderArchiveRefreshTest {
    @Test
    fun refreshesBothArchivesWhenOneRefreshFails() = runTest {
        val vehicles = FakeVehicles(throwsOnRefresh = true)
        val policies = FakePolicies()

        refreshCreatedOrderArchives(vehicles, policies)

        assertEquals(1, vehicles.refreshCalls)
        assertEquals(1, policies.refreshCalls)
    }

    private class FakeVehicles(private val throwsOnRefresh: Boolean = false) : CustomerVehiclesDataSource {
        override val snapshot: StateFlow<CustomerVehiclesSnapshot> = MutableStateFlow(CustomerVehiclesSnapshot())
        var refreshCalls = 0
        override suspend fun refresh() { refreshCalls += 1; if (throwsOnRefresh) error("vehicle refresh") }
        override suspend fun save(record: CustomerVehicleRecord) = Unit
    }

    private class FakePolicies : InsurancePoliciesDataSource {
        override val snapshot: StateFlow<InsurancePoliciesSnapshot> = MutableStateFlow(InsurancePoliciesSnapshot())
        var refreshCalls = 0
        override suspend fun refresh() { refreshCalls += 1 }
        override suspend fun save(policy: InsurancePolicyRecord) = Unit
        override suspend fun delete(id: String, expectedVersion: Int) = Unit
    }
}
