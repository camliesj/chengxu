package com.chengxu.autoservice.core.sync

import android.content.Context

import com.chengxu.autoservice.core.orders.CustomerVehiclesDataSource
import com.chengxu.autoservice.core.orders.HistoryOrdersDataSource
import com.chengxu.autoservice.core.orders.InsurancePoliciesDataSource
import com.chengxu.autoservice.core.orders.OrdersRepository
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

interface CompanySyncStore {
    fun read(companyId: String): Long?
    fun write(companyId: String, epochMillis: Long)
}

class InMemoryCompanySyncStore : CompanySyncStore {
    private val values = mutableMapOf<String, Long>()
    override fun read(companyId: String): Long? = values[companyId]
    override fun write(companyId: String, epochMillis: Long) { values[companyId] = epochMillis }
}

class SharedPreferencesCompanySyncStore(context: Context) : CompanySyncStore {
    private val preferences = context.getSharedPreferences("autoservice_company_sync", Context.MODE_PRIVATE)
    override fun read(companyId: String): Long? = preferences.getLong("sync:$companyId", -1L).takeIf { it > 0L }
    override fun write(companyId: String, epochMillis: Long) { preferences.edit().putLong("sync:$companyId", epochMillis).apply() }
}

data class CompanySyncState(
    val lastSuccessfulAtMillis: Long? = null,
    val syncing: Boolean = false,
    val message: String? = null,
)

class CompanySyncCoordinator(
    private val companyId: String,
    private val store: CompanySyncStore,
    private val now: () -> Long,
    private val orders: OrdersRepository,
    private val vehicles: CustomerVehiclesDataSource,
    private val policies: InsurancePoliciesDataSource,
    private val history: HistoryOrdersDataSource,
) {
    private val refreshMutex = Mutex()
    private val mutableState = MutableStateFlow(CompanySyncState(lastSuccessfulAtMillis = store.read(companyId)))
    val state: StateFlow<CompanySyncState> = mutableState.asStateFlow()

    suspend fun refreshAll() {
        if (!refreshMutex.tryLock()) return
        try {
            mutableState.update { it.copy(syncing = true, message = null) }
            coroutineScope {
                val requests = listOf(async { orders.refresh() }, async { vehicles.refresh() }, async { policies.refresh() }, async { history.refresh() })
                requests.forEach { it.await() }
            }
            val timestamp = now()
            store.write(companyId, timestamp)
            mutableState.value = CompanySyncState(lastSuccessfulAtMillis = timestamp)
        } catch (_: Exception) {
            mutableState.update { it.copy(syncing = false, message = "保险档案同步失败") }
        } finally {
            refreshMutex.unlock()
        }
    }
}
