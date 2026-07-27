package com.chengxu.autoservice.core.orders

import com.chengxu.autoservice.core.model.UserRole
import com.chengxu.autoservice.core.network.ConnectionState
import com.chengxu.autoservice.core.network.NetworkMonitor
import com.chengxu.autoservice.core.orders.model.OrderSummary
import com.chengxu.autoservice.core.session.AppSession
import com.chengxu.autoservice.core.session.PermissionSnapshot
import com.chengxu.autoservice.core.session.SessionRepository
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CompletableDeferred
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
class HistoryOrdersRepositoryTest {
    @Test
    fun cachedHistoryEmitsBeforeRefreshAndNextPageAppendsDistinctRows() = runTest {
        val cache = FakeHistoryOrderCache(mapOf("tongda" to listOf(order("cached"))))
        val firstResponse = CompletableDeferred<HistoryOrdersResult>()
        val api = FakeHistoryOrdersApi(
            results = ArrayDeque(
                listOf(
                    HistoryOrdersResult.Success(listOf(order("H-1"), order("H-2")), null),
                ),
            ),
            deferred = firstResponse,
        )
        val repository = repository(backgroundScope, cache = cache, api = api)

        runCurrent()

        assertEquals(listOf("cached"), repository.snapshot.value.orders.map { it.id })
        assertEquals(listOf(null), api.cursors)
        firstResponse.complete(HistoryOrdersResult.Success(listOf(order("H-1")), "cursor-2"))
        runCurrent()

        assertEquals(listOf("H-1"), repository.snapshot.value.orders.map { it.id })
        assertEquals("cursor-2", repository.snapshot.value.nextCursor)
        repository.loadNextPage()
        runCurrent()

        assertEquals(listOf("H-1", "H-2"), repository.snapshot.value.orders.map { it.id })
        assertEquals(listOf(null, "cursor-2"), api.cursors)
        assertEquals(listOf("H-1", "H-2"), cache.rows("tongda").map { it.id })
    }

    @Test
    fun offlineHistoryUsesScopedCacheWithoutCallingApi() = runTest {
        val cache = FakeHistoryOrderCache(
            mapOf(
                "tongda" to listOf(order("T-1")),
                "xinqiheng" to listOf(order("X-1", companyId = "xinqiheng")),
            ),
        )
        val api = FakeHistoryOrdersApi()
        val repository = repository(
            backgroundScope,
            cache = cache,
            api = api,
            connection = ConnectionState.Offline,
        )

        runCurrent()
        repository.refresh()
        repository.loadNextPage()

        assertEquals(listOf("T-1"), repository.snapshot.value.orders.map { it.id })
        assertEquals(0, api.cursors.size)
    }

    @Test
    fun foreignHistorySummaryRetainsCacheWithoutWritingForeignCompany() = runTest {
        val cache = FakeHistoryOrderCache(mapOf("tongda" to listOf(order("cached"))))
        val repository = repository(
            backgroundScope,
            cache = cache,
            api = FakeHistoryOrdersApi(
                results = ArrayDeque(
                    listOf(HistoryOrdersResult.Success(listOf(order("foreign", "xinqiheng")), null)),
                ),
            ),
        )

        runCurrent()

        assertEquals(listOf("cached"), repository.snapshot.value.orders.map { it.id })
        assertTrue(repository.snapshot.value.syncState is OrderSyncState.Stale)
        assertEquals(listOf("cached"), cache.rows("tongda").map { it.id })
    }

    @Test
    fun unauthorizedClearsHistoryCacheBeforeInvalidatingSession() = runTest {
        val events = mutableListOf<String>()
        val cache = FakeHistoryOrderCache(
            initial = mapOf("tongda" to listOf(order("cached"))),
            events = events,
        )
        val repository = repository(
            backgroundScope,
            cache = cache,
            api = FakeHistoryOrdersApi(
                results = ArrayDeque(listOf(HistoryOrdersResult.Failure(OrdersFailure.Unauthorized))),
            ),
            invalidator = SessionInvalidator { events += "invalidate" },
        )

        runCurrent()

        assertEquals(listOf("clear", "invalidate"), events)
        assertTrue(repository.snapshot.value.orders.isEmpty())
    }

    private fun repository(
        scope: kotlinx.coroutines.CoroutineScope,
        cache: FakeHistoryOrderCache,
        api: HistoryOrdersApi = FakeHistoryOrdersApi(),
        connection: ConnectionState = ConnectionState.Online,
        invalidator: SessionInvalidator = SessionInvalidator { },
    ) = HistoryOrdersRepository(
        applicationScope = scope,
        sessionRepository = FakeSessionRepository(session()),
        networkMonitor = FakeNetworkMonitor(connection),
        historyOrdersApi = api,
        historyOrderCache = cache,
        sessionInvalidator = invalidator,
    )

    private fun session() = AppSession(
        companyId = "tongda",
        companyName = "通达",
        username = "worker",
        staffName = "员工",
        token = "token-worker",
        role = UserRole.EMPLOYEE,
        permissions = PermissionSnapshot.forRole(UserRole.EMPLOYEE),
    )

    private fun order(id: String, companyId: String = "tongda") = OrderSummary(
        id = id,
        companyId = companyId,
        version = 1,
        date = "2026-07-20",
        dateSortKey = "2026-07-20",
        time = "09:30",
        plate = "蒙A12345",
        customer = "张先生",
        car = "大众帕萨特",
        type = "常规保养",
        status = "已结算",
        amountCents = 50_025,
        record = "更换机油与滤芯",
        insuranceExpiry = "2026-08-01",
        delivery = "2026-07-20 18:00",
        updatedAt = "2026-07-20T09:30:00Z",
    )

    private class FakeSessionRepository(initial: AppSession?) : SessionRepository {
        override val session: StateFlow<AppSession?> = MutableStateFlow(initial)
    }

    private class FakeNetworkMonitor(initial: ConnectionState) : NetworkMonitor {
        override val connection: StateFlow<ConnectionState> = MutableStateFlow(initial)
    }

    private class FakeHistoryOrdersApi(
        private val results: ArrayDeque<HistoryOrdersResult> = ArrayDeque(),
        private var deferred: CompletableDeferred<HistoryOrdersResult>? = null,
    ) : HistoryOrdersApi {
        val cursors = mutableListOf<String?>()

        override suspend fun fetch(token: String, cursor: String?): HistoryOrdersResult {
            cursors += cursor
            deferred?.let { pending ->
                deferred = null
                return pending.await()
            }
            return results.removeFirstOrNull() ?: HistoryOrdersResult.Success(emptyList(), null)
        }
    }

    private class FakeHistoryOrderCache(
        initial: Map<String, List<OrderSummary>> = emptyMap(),
        private val events: MutableList<String> = mutableListOf(),
    ) : HistoryOrderCache {
        private val rowsByCompany = initial.mapValuesTo(mutableMapOf()) { MutableStateFlow(it.value) }

        override fun observeHistory(companyId: String): Flow<List<OrderSummary>> =
            rowsByCompany.getOrPut(companyId) { MutableStateFlow(emptyList()) }

        override suspend fun replaceHistory(companyId: String, orders: List<OrderSummary>) {
            rowsByCompany.getOrPut(companyId) { MutableStateFlow(emptyList()) }.value = orders
        }

        override suspend fun appendHistory(companyId: String, orders: List<OrderSummary>) {
            val rows = rowsByCompany.getOrPut(companyId) { MutableStateFlow(emptyList()) }
            rows.value = (rows.value + orders).distinctBy { it.id }
        }

        override suspend fun clear() {
            events += "clear"
            rowsByCompany.values.forEach { it.value = emptyList() }
        }

        fun rows(companyId: String): List<OrderSummary> = rowsByCompany[companyId]?.value.orEmpty()
    }
}
