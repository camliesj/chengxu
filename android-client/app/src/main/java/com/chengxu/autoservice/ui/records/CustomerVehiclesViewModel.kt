package com.chengxu.autoservice.ui.records

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chengxu.autoservice.core.orders.CustomerVehicleRecord
import com.chengxu.autoservice.core.orders.CustomerVehiclesDataSource
import com.chengxu.autoservice.core.orders.OrderSyncState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.util.Locale

data class CustomerVehiclesUiState(
    val loading: Boolean = true,
    val refreshing: Boolean = false,
    val syncMessage: String? = null,
    val query: String = "",
    val records: List<CustomerVehicleRecord> = emptyList(),
    val visibleRecords: List<CustomerVehicleRecord> = emptyList(),
)

class CustomerVehiclesViewModel(private val source: CustomerVehiclesDataSource) : ViewModel() {
    private val query = MutableStateFlow("")
    val uiState: StateFlow<CustomerVehiclesUiState> = combine(source.snapshot, query) { snapshot, currentQuery ->
        val normalized = currentQuery.trim().lowercase(Locale.ROOT)
        val visible = snapshot.records.filter { record -> normalized.isBlank() || listOf(record.customer, record.phone, record.plate, record.car, record.vin).any { it.lowercase(Locale.ROOT).contains(normalized) } }
        CustomerVehiclesUiState(
            loading = snapshot.syncState == OrderSyncState.LoadingCache,
            refreshing = snapshot.syncState == OrderSyncState.Refreshing,
            syncMessage = (snapshot.syncState as? OrderSyncState.Stale)?.message,
            query = currentQuery, records = snapshot.records, visibleRecords = visible,
        )
    }.stateIn(viewModelScope, SharingStarted.Eagerly, CustomerVehiclesUiState())
    fun updateQuery(value: String) { query.value = value }
    fun refresh() { viewModelScope.launch { source.refresh() } }
}
