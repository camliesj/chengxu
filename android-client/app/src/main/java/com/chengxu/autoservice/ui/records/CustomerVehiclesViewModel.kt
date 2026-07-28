package com.chengxu.autoservice.ui.records

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chengxu.autoservice.core.orders.CustomerVehicleRecord
import com.chengxu.autoservice.core.orders.CustomerVehiclesDataSource
import com.chengxu.autoservice.core.orders.OrderSyncState
import com.chengxu.autoservice.core.model.AppPermission
import com.chengxu.autoservice.core.network.ConnectionState
import com.chengxu.autoservice.core.session.PermissionSnapshot
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.util.Locale
import java.util.UUID

data class CustomerVehiclesUiState(
    val loading: Boolean = true,
    val refreshing: Boolean = false,
    val syncMessage: String? = null,
    val query: String = "",
    val records: List<CustomerVehicleRecord> = emptyList(),
    val visibleRecords: List<CustomerVehicleRecord> = emptyList(),
    val draft: CustomerVehicleRecord? = null,
    val canManage: Boolean = false,
    val submitDisabled: Boolean = true,
)

class CustomerVehiclesViewModel(private val source: CustomerVehiclesDataSource, connection: StateFlow<ConnectionState>, permissions: PermissionSnapshot) : ViewModel() {
    private val query = MutableStateFlow("")
    private val draft = MutableStateFlow<CustomerVehicleRecord?>(null)
    private val canManage = permissions.allows(AppPermission.MANAGE_CUSTOMER_VEHICLES)
    val uiState: StateFlow<CustomerVehiclesUiState> = combine(source.snapshot, connection, query, draft) { snapshot, network, currentQuery, currentDraft ->
        val normalized = currentQuery.trim().lowercase(Locale.ROOT)
        val visible = snapshot.records.filter { record -> normalized.isBlank() || listOf(record.customer, record.phone, record.plate, record.car, record.vin).any { it.lowercase(Locale.ROOT).contains(normalized) } }
        CustomerVehiclesUiState(
            loading = snapshot.syncState == OrderSyncState.LoadingCache,
            refreshing = snapshot.syncState == OrderSyncState.Refreshing,
            syncMessage = (snapshot.syncState as? OrderSyncState.Stale)?.message,
            query = currentQuery, records = snapshot.records, visibleRecords = visible, draft = currentDraft,
            canManage = canManage, submitDisabled = !canManage || network != ConnectionState.Online,
        )
    }.stateIn(viewModelScope, SharingStarted.Eagerly, CustomerVehiclesUiState(canManage = canManage, submitDisabled = !canManage || connection.value != ConnectionState.Online))
    fun updateQuery(value: String) { query.value = value }
    fun refresh() { viewModelScope.launch { source.refresh() } }
    fun openCreate() { source.snapshot.value.companyId?.takeIf { canManage }?.let { companyId -> draft.value = CustomerVehicleRecord(UUID.randomUUID().toString(), companyId, "", "", "", "", "", "", "标的车", "手动录入", "") } }
    fun openEdit(record: CustomerVehicleRecord) { if (canManage) draft.value = record }
    fun updateDraft(transform: (CustomerVehicleRecord) -> CustomerVehicleRecord) { draft.value = draft.value?.let(transform) }
    fun dismissEditor() { draft.value = null }
    fun save() { viewModelScope.launch { draft.value?.takeIf { !uiState.value.submitDisabled && listOf(it.customer, it.plate, it.car).all(String::isNotBlank) }?.let { source.save(it); draft.value = null } } }
}
