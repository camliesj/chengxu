package com.chengxu.autoservice.core.sync

import com.chengxu.autoservice.core.orders.CustomerVehiclesDataSource
import com.chengxu.autoservice.core.orders.CustomerVehiclesSnapshot
import com.chengxu.autoservice.core.orders.HistoryOrdersDataSource
import com.chengxu.autoservice.core.orders.HistoryOrdersSnapshot
import com.chengxu.autoservice.core.orders.InsurancePoliciesDataSource
import com.chengxu.autoservice.core.orders.InsurancePoliciesSnapshot
import com.chengxu.autoservice.core.orders.OrdersRepository
import com.chengxu.autoservice.core.orders.OrdersSnapshot
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test

class CompanySyncCoordinatorTest {
    @Test fun failureKeepsPreviousSyncTime() = runTest {
        val store = FakeStore(1000L)
        val coordinator = CompanySyncCoordinator(
            companyId = "tongda", store = store, now = { 2000L },
            orders = FakeOrders(), vehicles = FakeVehicles(), policies = FakePolicies(fails = true), history = FakeHistory(),
        )

        coordinator.refreshAll()

        assertEquals(1000L, coordinator.state.value.lastSuccessfulAtMillis)
        assertFalse(coordinator.state.value.syncing)
        assertEquals("保险档案同步失败", coordinator.state.value.message)
    }

    private class FakeStore(private var value: Long?) : CompanySyncStore {
        override fun read(companyId: String) = value
        override fun write(companyId: String, epochMillis: Long) { value = epochMillis }
    }
    private class FakeOrders : OrdersRepository { override val snapshot: StateFlow<OrdersSnapshot> = MutableStateFlow(OrdersSnapshot()); override suspend fun refresh() = Unit }
    private class FakeVehicles : CustomerVehiclesDataSource { override val snapshot: StateFlow<CustomerVehiclesSnapshot> = MutableStateFlow(CustomerVehiclesSnapshot()); override suspend fun refresh() = Unit; override suspend fun save(record: com.chengxu.autoservice.core.orders.CustomerVehicleRecord) = Unit }
    private class FakePolicies(private val fails: Boolean = false) : InsurancePoliciesDataSource { override val snapshot: StateFlow<InsurancePoliciesSnapshot> = MutableStateFlow(InsurancePoliciesSnapshot()); override suspend fun refresh() { if (fails) error("保险档案同步失败") }; override suspend fun save(policy: com.chengxu.autoservice.core.orders.InsurancePolicyRecord) = Unit; override suspend fun delete(id: String, expectedVersion: Int) = Unit }
    private class FakeHistory : HistoryOrdersDataSource { override val snapshot: StateFlow<HistoryOrdersSnapshot> = MutableStateFlow(HistoryOrdersSnapshot()); override suspend fun refresh() = Unit; override suspend fun loadNextPage() = Unit }
}
