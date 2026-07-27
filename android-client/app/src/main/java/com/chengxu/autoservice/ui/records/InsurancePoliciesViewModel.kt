package com.chengxu.autoservice.ui.records

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chengxu.autoservice.core.model.AppPermission
import com.chengxu.autoservice.core.network.ConnectionState
import com.chengxu.autoservice.core.orders.InsurancePoliciesDataSource
import com.chengxu.autoservice.core.orders.InsurancePolicyRecord
import com.chengxu.autoservice.core.orders.InsuranceWriteState
import com.chengxu.autoservice.core.orders.OrderSyncState
import com.chengxu.autoservice.core.session.PermissionSnapshot
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.util.Locale
import java.util.UUID

data class InsurancePoliciesUiState(
    val loading: Boolean = true,
    val refreshing: Boolean = false,
    val syncMessage: String? = null,
    val query: String = "",
    val records: List<InsurancePolicyRecord> = emptyList(),
    val visibleRecords: List<InsurancePolicyRecord> = emptyList(),
    val draft: InsurancePolicyRecord? = null,
    val deleteTarget: InsurancePolicyRecord? = null,
    val canManage: Boolean = false,
    val submitDisabled: Boolean = true,
    val conflict: InsurancePolicyRecord? = null,
    val writeMessage: String? = null,
)

class InsurancePoliciesViewModel(
    private val source: InsurancePoliciesDataSource,
    connection: StateFlow<ConnectionState>,
    permissions: PermissionSnapshot,
) : ViewModel() {
    private val query = MutableStateFlow("")
    private val draft = MutableStateFlow<InsurancePolicyRecord?>(null)
    private val deleteTarget = MutableStateFlow<InsurancePolicyRecord?>(null)
    private val canManage = permissions.allows(AppPermission.MANAGE_INSURANCE)

    val uiState: StateFlow<InsurancePoliciesUiState> = combine(
        source.snapshot, connection, query, draft, deleteTarget,
    ) { snapshot, network, currentQuery, currentDraft, currentDeleteTarget ->
        val normalized = currentQuery.trim().lowercase(Locale.ROOT)
        val visible = snapshot.records.filter { record -> normalized.isBlank() || listOf(
            record.plate, record.customer, record.phone, record.car, record.vin, record.insurer,
        ).any { it.lowercase(Locale.ROOT).contains(normalized) } }
        val write = snapshot.writeState
        InsurancePoliciesUiState(
            loading = snapshot.syncState == OrderSyncState.LoadingCache,
            refreshing = snapshot.syncState == OrderSyncState.Refreshing,
            syncMessage = (snapshot.syncState as? OrderSyncState.Stale)?.message,
            query = currentQuery, records = snapshot.records, visibleRecords = visible,
            draft = currentDraft, deleteTarget = currentDeleteTarget, canManage = canManage,
            submitDisabled = !canManage || network != ConnectionState.Online || write == InsuranceWriteState.Saving,
            conflict = (write as? InsuranceWriteState.Conflict)?.latest,
            writeMessage = (write as? InsuranceWriteState.Failed)?.message,
        )
    }.stateIn(
        viewModelScope,
        SharingStarted.Eagerly,
        InsurancePoliciesUiState(
            canManage = canManage,
            submitDisabled = !canManage || connection.value != ConnectionState.Online,
        ),
    )

    fun updateQuery(value: String) { query.value = value }
    fun refresh() { viewModelScope.launch { source.refresh() } }
    fun openCreate() {
        if (!canManage) return
        val companyId = source.snapshot.value.companyId ?: return
        draft.value = InsurancePolicyRecord(UUID.randomUUID().toString(), companyId, 0, "", "", "", "", "", "", 0L, "", "", "")
    }
    fun openEdit(policy: InsurancePolicyRecord) { if (canManage) draft.value = policy }
    fun updateDraft(transform: (InsurancePolicyRecord) -> InsurancePolicyRecord) { draft.value = draft.value?.let(transform) }
    fun dismissEditor() { draft.value = null }
    fun save() { viewModelScope.launch {
        val value = draft.value ?: return@launch
        if (uiState.value.submitDisabled) return@launch
        source.save(value)
        if (source.snapshot.value.writeState is InsuranceWriteState.Conflict) source.refresh()
        else if (source.snapshot.value.writeState == InsuranceWriteState.Idle) draft.value = null
    } }
    fun requestDelete(policy: InsurancePolicyRecord) { if (canManage) deleteTarget.value = policy }
    fun dismissDelete() { deleteTarget.value = null }
    fun confirmDelete() { viewModelScope.launch {
        val target = deleteTarget.value ?: return@launch
        if (uiState.value.submitDisabled) return@launch
        source.delete(target.id, target.version)
        if (source.snapshot.value.writeState is InsuranceWriteState.Conflict) source.refresh()
        else if (source.snapshot.value.writeState !is InsuranceWriteState.Saving) deleteTarget.value = null
    } }
}
