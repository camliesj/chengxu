package com.chengxu.autoservice.core.orders

import com.chengxu.autoservice.core.model.UserRole
import com.chengxu.autoservice.core.network.ConnectionState
import com.chengxu.autoservice.core.network.NetworkMonitor
import com.chengxu.autoservice.core.orders.cache.OrderDao
import com.chengxu.autoservice.core.orders.cache.OrderSummaryEntity
import com.chengxu.autoservice.core.orders.cache.RoomOrderCache
import com.chengxu.autoservice.core.session.AppSession
import com.chengxu.autoservice.core.session.PermissionSnapshot
import com.chengxu.autoservice.core.session.SessionRepository
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class CachedOrdersRepositoryTest {
    @Test
    fun cachedRowsEmitBeforeDelayedRemoteResponse() = runTest {
        val cache = FakeOrderCache(mapOf("tongda" to listOf(order("cached"))))
        val remote = CompletableDeferred<OrdersResult>()
        val api = FakeOrdersApi(deferred = remote)
        val repository = repository(backgroundScope, cache = cache, api = api)

        runCurrent()

        assertEquals(listOf("cached"), repository.snapshot.value.orders.map { it.id })
        assertEquals(OrderSyncState.Refreshing, repository.snapshot.value.syncState)
        assertEquals(1, api.callCount)

        remote.complete(OrdersResult.Success(listOf(order("remote"))))
        runCurrent()

        assertEquals(listOf("remote"), repository.snapshot.value.orders.map { it.id })
        assertEquals(OrderSyncState.Ready, repository.snapshot.value.syncState)
    }

    @Test
    fun offlineUsesCacheWithoutCallingApi() = runTest {
        val cache = FakeOrderCache(mapOf("tongda" to listOf(order("cached"))))
        val api = FakeOrdersApi()
        val repository = repository(
            backgroundScope,
            cache = cache,
            api = api,
            connection = ConnectionState.Offline,
        )

        runCurrent()
        repository.refresh()

        assertEquals(listOf("cached"), repository.snapshot.value.orders.map { it.id })
        assertEquals(OrderSyncState.Ready, repository.snapshot.value.syncState)
        assertEquals(0, api.callCount)
    }

    @Test
    fun successfulRefreshReplacesOnlyCurrentCompanyRows() = runTest {
        val otherCompany = order("other", companyId = "xinqiheng")
        val cache = FakeOrderCache(
            mapOf(
                "tongda" to listOf(order("old")),
                "xinqiheng" to listOf(otherCompany),
            ),
        )
        val network = FakeNetworkMonitor(ConnectionState.Offline)
        val api = FakeOrdersApi(OrdersResult.Success(listOf(order("new", companyId = "foreign"))))
        val repository = repository(backgroundScope, cache = cache, api = api, network = network)
        runCurrent()

        network.mutableConnection.value = ConnectionState.Online
        runCurrent()

        assertEquals(listOf("tongda"), cache.replacedCompanies)
        assertEquals(listOf("other"), cache.rows("xinqiheng").map { it.id })
        assertEquals(listOf("new"), repository.snapshot.value.orders.map { it.id })
    }

    @Test
    fun failedRefreshRetainsCachedRowsAndPublishesStaleMessage() = runTest {
        val cache = FakeOrderCache(mapOf("tongda" to listOf(order("cached"))))
        val repository = repository(
            backgroundScope,
            cache = cache,
            api = FakeOrdersApi(OrdersResult.Failure(OrdersFailure.NetworkUnavailable)),
        )

        runCurrent()

        assertEquals(listOf("cached"), repository.snapshot.value.orders.map { it.id })
        assertEquals(
            OrderSyncState.Stale("网络异常，当前数据可能不是最新"),
            repository.snapshot.value.syncState,
        )
    }

    @Test
    fun emptyFailureKeepsRetryableStaleState() = runTest {
        val repository = repository(
            backgroundScope,
            cache = FakeOrderCache(),
            api = FakeOrdersApi(OrdersResult.Failure(OrdersFailure.ServerError)),
        )

        runCurrent()

        assertTrue(repository.snapshot.value.orders.isEmpty())
        assertEquals(
            OrderSyncState.Stale("服务器暂时不可用，当前数据可能不是最新"),
            repository.snapshot.value.syncState,
        )
    }

    @Test
    fun unauthorizedClearsCacheBeforeInvalidatingSession() = runTest {
        val events = mutableListOf<String>()
        val cache = FakeOrderCache(
            initial = mapOf("tongda" to listOf(order("cached"))),
            events = events,
        )
        val repository = repository(
            backgroundScope,
            cache = cache,
            api = FakeOrdersApi(OrdersResult.Failure(OrdersFailure.Unauthorized)),
            invalidator = SessionInvalidator { events += "invalidate" },
        )

        runCurrent()

        assertEquals(listOf("clear", "invalidate"), events)
        assertTrue(repository.snapshot.value.orders.isEmpty())
    }

    @Test
    fun simultaneousRefreshCallsUseOneRemoteRequest() = runTest {
        val remote = CompletableDeferred<OrdersResult>()
        val api = FakeOrdersApi(deferred = remote)
        val repository = repository(backgroundScope, cache = FakeOrderCache(), api = api)

        val first = async { repository.refresh() }
        api.started.await()
        val second = async { repository.refresh() }
        second.await()

        assertEquals(1, api.callCount)
        remote.complete(OrdersResult.Success(emptyList()))
        first.await()
    }

    @Test
    fun directAuthenticatedAccountOrCompanySwitchClearsRowsBeforeObservingNewIdentity() = runTest {
        val sessionRepository = FakeSessionRepository(session("tongda", "worker"))
        val cache = FakeOrderCache(
            mapOf(
                "tongda" to listOf(order("a")),
                "xinqiheng" to listOf(order("b", companyId = "xinqiheng")),
            ),
        )
        val repository = repository(
            backgroundScope,
            cache = cache,
            sessionRepository = sessionRepository,
            connection = ConnectionState.Offline,
        )
        runCurrent()
        assertEquals(listOf("a"), repository.snapshot.value.orders.map { it.id })

        sessionRepository.mutableSession.value = session("xinqiheng", "worker")
        runCurrent()

        assertEquals(1, cache.clearCount)
        assertTrue(repository.snapshot.value.orders.isEmpty())

        val accountSessionRepository = FakeSessionRepository(session("tongda", "worker"))
        val accountCache = FakeOrderCache(mapOf("tongda" to listOf(order("account-a"))))
        repository(
            backgroundScope,
            cache = accountCache,
            sessionRepository = accountSessionRepository,
            connection = ConnectionState.Offline,
        )
        runCurrent()

        accountSessionRepository.mutableSession.value = session("tongda", "manager")
        runCurrent()

        assertEquals(1, accountCache.clearCount)
    }

    @Test
    fun cancellationEscapesRefreshWithoutBusinessMapping() = runTest {
        val cancellation = CancellationException("cancelled")
        val repository = repository(
            backgroundScope,
            cache = FakeOrderCache(),
            api = FakeOrdersApi(cancellation = cancellation),
        )

        try {
            repository.refresh()
            fail("Expected cancellation")
        } catch (caught: CancellationException) {
            assertSame(cancellation, caught)
        }
    }

    @Test
    fun roomCacheOverwritesUntrustedRemoteCompanyAndMapsRowsBack() = runTest {
        val dao = RecordingOrderDao()
        val cache = RoomOrderCache(dao)

        cache.replace("tongda", listOf(order("remote", companyId = "foreign")))

        assertEquals(listOf("tongda"), dao.inserted.map { it.companyId })
        assertEquals("tongda", cache.observe("tongda").first().single().companyId)
        assertEquals("remote", cache.observe("tongda").first().single().id)
    }

    private fun repository(
        scope: kotlinx.coroutines.CoroutineScope,
        cache: FakeOrderCache,
        api: OrdersApi = FakeOrdersApi(),
        sessionRepository: FakeSessionRepository = FakeSessionRepository(session()),
        network: FakeNetworkMonitor = FakeNetworkMonitor(ConnectionState.Online),
        connection: ConnectionState? = null,
        invalidator: SessionInvalidator = SessionInvalidator { },
    ): CachedOrdersRepository {
        connection?.let { network.mutableConnection.value = it }
        return CachedOrdersRepository(
            applicationScope = scope,
            sessionRepository = sessionRepository,
            networkMonitor = network,
            ordersApi = api,
            orderCache = cache,
            sessionInvalidator = invalidator,
        )
    }

    private fun session(companyId: String = "tongda", username: String = "worker") = AppSession(
        companyId = companyId,
        companyName = companyId,
        username = username,
        staffName = username,
        token = "token-$username",
        role = UserRole.EMPLOYEE,
        permissions = PermissionSnapshot.forRole(UserRole.EMPLOYEE),
    )

    private fun order(id: String, companyId: String = "tongda") = RepairOrder(
        id = id,
        companyId = companyId,
        date = "2026-07-20",
        dateSortKey = "2026-07-20",
        time = "09:30",
        plate = "蒙A12345",
        customer = "张先生",
        car = "大众帕萨特",
        type = "常规保养",
        status = "在修中",
        amountCents = 50_025,
        record = "更换机油与滤芯",
        insuranceExpiry = "2026-08-01",
        delivery = "2026-07-20 18:00",
    )

    private class FakeSessionRepository(initial: AppSession?) : SessionRepository {
        val mutableSession = MutableStateFlow(initial)
        override val session: StateFlow<AppSession?> = mutableSession
    }

    private class FakeNetworkMonitor(initial: ConnectionState) : NetworkMonitor {
        val mutableConnection = MutableStateFlow(initial)
        override val connection: StateFlow<ConnectionState> = mutableConnection
    }

    private class FakeOrdersApi(
        var result: OrdersResult = OrdersResult.Success(emptyList()),
        private val deferred: CompletableDeferred<OrdersResult>? = null,
        private val cancellation: CancellationException? = null,
    ) : OrdersApi {
        val started = CompletableDeferred<Unit>()
        var callCount = 0
        var lastToken: String? = null

        override suspend fun fetch(token: String): OrdersResult {
            callCount += 1
            lastToken = token
            started.complete(Unit)
            cancellation?.let { throw it }
            return deferred?.await() ?: result
        }
    }

    private class FakeOrderCache(
        initial: Map<String, List<RepairOrder>> = emptyMap(),
        private val events: MutableList<String> = mutableListOf(),
    ) : OrderCache {
        private val companyRows = initial.mapValuesTo(mutableMapOf()) { MutableStateFlow(it.value) }
        val replacedCompanies = mutableListOf<String>()
        var clearCount = 0

        override fun observe(companyId: String): Flow<List<RepairOrder>> =
            companyRows.getOrPut(companyId) { MutableStateFlow(emptyList()) }

        override suspend fun replace(companyId: String, orders: List<RepairOrder>) {
            replacedCompanies += companyId
            companyRows.getOrPut(companyId) { MutableStateFlow(emptyList()) }.value =
                orders.map { it.copy(companyId = companyId) }
        }

        override suspend fun clear() {
            events += "clear"
            clearCount += 1
            companyRows.values.forEach { it.value = emptyList() }
        }

        fun rows(companyId: String): List<RepairOrder> = companyRows[companyId]?.value.orEmpty()
    }

    private class RecordingOrderDao : OrderDao {
        var inserted: List<OrderSummaryEntity> = emptyList()

        override fun observeByCompany(companyId: String): Flow<List<OrderSummaryEntity>> =
            flowOf(inserted.filter { it.companyId == companyId })

        override fun observeByCompanyAndScope(
            companyId: String,
            scope: String,
        ): Flow<List<OrderSummaryEntity>> =
            flowOf(inserted.filter { it.companyId == companyId && it.scope == scope })

        override suspend fun insertAll(orders: List<OrderSummaryEntity>) {
            inserted = inserted + orders
        }

        override suspend fun deleteByCompany(companyId: String) {
            inserted = inserted.filterNot { it.companyId == companyId }
        }

        override suspend fun clearAll() {
            inserted = emptyList()
        }
    }
}
