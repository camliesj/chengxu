package com.chengxu.autoservice.ui.records

import com.chengxu.autoservice.core.model.AppPermission
import com.chengxu.autoservice.core.network.ConnectionState
import com.chengxu.autoservice.core.orders.InsurancePoliciesDataSource
import com.chengxu.autoservice.core.orders.InsurancePoliciesSnapshot
import com.chengxu.autoservice.core.session.PermissionSnapshot
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertTrue
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class InsurancePoliciesViewModelTest {
    @Test fun offlineCreateIsDisabled() = runTest {
        val viewModel = InsurancePoliciesViewModel(
            FakeSource(),
            MutableStateFlow(ConnectionState.Offline),
            PermissionSnapshot.fromGranted(setOf(AppPermission.MANAGE_INSURANCE)),
        )

        viewModel.openCreate()
        runCurrent()

        assertTrue(viewModel.uiState.value.submitDisabled)
    }

    private class FakeSource : InsurancePoliciesDataSource {
        override val snapshot: StateFlow<InsurancePoliciesSnapshot> = MutableStateFlow(InsurancePoliciesSnapshot())
        override suspend fun refresh() = Unit
        override suspend fun save(policy: com.chengxu.autoservice.core.orders.InsurancePolicyRecord) = Unit
        override suspend fun delete(id: String, expectedVersion: Int) = Unit
    }
}
