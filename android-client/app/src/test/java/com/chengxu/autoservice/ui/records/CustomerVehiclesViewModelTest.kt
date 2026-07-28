package com.chengxu.autoservice.ui.records

import com.chengxu.autoservice.core.model.AppPermission
import com.chengxu.autoservice.core.network.ConnectionState
import com.chengxu.autoservice.core.orders.CustomerVehiclesDataSource
import com.chengxu.autoservice.core.orders.CustomerVehiclesSnapshot
import com.chengxu.autoservice.core.session.PermissionSnapshot
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Before
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class CustomerVehiclesViewModelTest {
    private val dispatcher = UnconfinedTestDispatcher()

    @Before fun setUp() = Dispatchers.setMain(dispatcher)
    @After fun tearDown() = Dispatchers.resetMain()

    @Test
    fun customersPermissionEnablesVehicleCreateDraft() = runTest {
        val permissions = PermissionSnapshot.fromGranted(setOf(AppPermission.MANAGE_CUSTOMER_VEHICLES))
        assertTrue(permissions.allows(AppPermission.MANAGE_CUSTOMER_VEHICLES))
        val source = FakeSource()
        val viewModel = CustomerVehiclesViewModel(
            source,
            MutableStateFlow(ConnectionState.Online),
            permissions,
        )

        runCurrent()
        viewModel.openCreate()
        runCurrent()

        assertTrue(viewModel.uiState.value.canManage)
        assertTrue(viewModel.uiState.value.draft != null)

        viewModel.updateDraft { it.copy(customer = "王先生", plate = "蒙A12345", car = "P7") }
        viewModel.save()
        runCurrent()

        assertEquals("蒙A12345", source.savedRecords.single().plate)
        assertNull(viewModel.uiState.value.draft)
    }

    private class FakeSource : CustomerVehiclesDataSource {
        override val snapshot: StateFlow<CustomerVehiclesSnapshot> = MutableStateFlow(CustomerVehiclesSnapshot(companyId = "tongda"))
        val savedRecords = mutableListOf<com.chengxu.autoservice.core.orders.CustomerVehicleRecord>()
        override suspend fun refresh() = Unit
        override suspend fun save(record: com.chengxu.autoservice.core.orders.CustomerVehicleRecord) { savedRecords += record }
    }
}
