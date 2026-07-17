# Android Orders API and Room Cache Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Android workbench demo orders and fixed metrics with authenticated `/api/orders` data backed by a company-isolated Room cache and safe offline behavior.

**Architecture:** A focused orders data package owns the remote API, Room storage, domain model, and cache-first repository. `WorkbenchViewModel` consumes a stable `OrdersRepository` snapshot and maps it into role-specific UI metrics, while `AuthenticationRepository` owns the exact moments at which authenticated customer data is cleared.

**Tech Stack:** Kotlin 2.3.21, coroutines/Flow 1.10.2, Kotlin Serialization 1.11.0, AndroidX Room 2.8.4, KSP2 2.3.9, Compose Material 3, JUnit 4, Android instrumentation tests.

## Global Constraints

- Android remains an independent project under `android-client/`; do not alter the existing web layout to simulate mobile behavior.
- `compileSdk 36`, `targetSdk 35`, `minSdk 26`, JDK/JVM 17, production API origin `https://chengxu.pages.dev`.
- Token comes only from the current in-memory `AppSession`; never persist it in Room or emit it to logs.
- Offline mode is read-only, never performs an orders request, and keeps the existing copy “网络不可用，当前为只读模式”.
- `401` invalidates authentication and clears cached orders before showing login.
- Logout, invalid restore, account change, or company change clears all order cache to prevent customer-data residue.
- This milestone is read-only: no create, edit, delete, settlement, status mutation, offline write queue, paging, or background periodic sync.
- Do not start an Android emulator. Keep JVM tests, Android test code compilation, Lint, and APK build.
- After every task: update `docs/latest-handoff-prompt.md`, commit, and push `codex/android-mobile-ui-atlas`.

---

## File Structure

- `core/orders/RepairOrder.kt`: normalized domain record and safe date/money helpers.
- `core/orders/OrdersApi.kt`: remote result contract.
- `core/orders/HttpUrlConnectionOrdersApi.kt`: authenticated GET transport and JSON mapping.
- `core/orders/OrdersRepository.kt`: cache-first observable snapshot contract.
- `core/orders/CachedOrdersRepository.kt`: session/network orchestration, refresh de-duplication, and failure handling.
- `core/orders/cache/OrderEntity.kt`: Room persistence schema without Token or sensitive session fields.
- `core/orders/cache/OrderDao.kt`: company query, transactional replacement, and clear operations.
- `core/orders/cache/AutoserviceDatabase.kt`: versioned Room database construction.
- `core/orders/cache/RoomOrderCache.kt`: maps Room rows to domain records behind a testable cache boundary.
- `core/auth/AuthenticatedDataCleaner.kt`: narrow cleanup interface invoked by authentication lifecycle events.
- `ui/workbench/WorkbenchMetrics.kt`: deterministic role/date metrics and order-card mapping.
- Existing app, shell, navigation, screen, ViewModel, Gradle, test, and handoff files are modified only where their responsibility requires it.

---

### Task 1: Room dependency and company-isolated persistence

**Files:**
- Modify: `android-client/gradle/libs.versions.toml`
- Modify: `android-client/app/build.gradle.kts`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/orders/cache/OrderEntity.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/orders/cache/OrderDao.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/orders/cache/AutoserviceDatabase.kt`
- Create: `android-client/app/src/androidTest/java/com/chengxu/autoservice/core/orders/cache/OrderDaoTest.kt`
- Create after compiler output: `android-client/app/schemas/com.chengxu.autoservice.core.orders.cache.AutoserviceDatabase/1.json`
- Modify: `docs/latest-handoff-prompt.md`

**Interfaces:**
- Produces: `OrderDao.observeByCompany(String): Flow<List<OrderEntity>>`, `replaceCompany(String, List<OrderEntity>)`, `clearAll()`.

- [ ] **Step 1: Add Room DAO tests before the production types exist**

Create an instrumentation test that opens an in-memory database and proves: rows are sorted by `dateSortKey/time`, replacing company A preserves company B, and `clearAll()` removes both. Use `runTest`, `Room.inMemoryDatabaseBuilder`, `flow.first()`, and distinct IDs `A-1`, `A-2`, `B-1`.

```kotlin
@Test
fun replaceIsAtomicAndCompanyScoped() = runTest {
    dao.replaceCompany("tongda", listOf(entity("A-1", "tongda", "2026-07-16", "08:00")))
    dao.replaceCompany("xinqiheng", listOf(entity("B-1", "xinqiheng", "2026-07-17", "09:00")))
    dao.replaceCompany("tongda", listOf(entity("A-2", "tongda", "2026-07-18", "10:00")))

    assertEquals(listOf("A-2"), dao.observeByCompany("tongda").first().map { it.orderId })
    assertEquals(listOf("B-1"), dao.observeByCompany("xinqiheng").first().map { it.orderId })
}
```

- [ ] **Step 2: Compile the Android test and verify RED**

Run: `cd android-client; .\gradlew.bat :app:compileDebugAndroidTestKotlin`

Expected: FAIL because `AutoserviceDatabase`, `OrderDao`, and `OrderEntity` are unresolved.

- [ ] **Step 3: Add verified Room/KSP dependencies**

Add versions `room = "2.8.4"`, `ksp = "2.3.9"`; add Room runtime/compiler/testing libraries; add `com.google.devtools.ksp` and `androidx.room` plugin aliases. Apply both plugins, use `ksp(libs.androidx.room.compiler)`, `androidTestImplementation(libs.androidx.room.testing)`, and configure:

```kotlin
room {
    schemaDirectory("$projectDir/schemas")
}
```

- [ ] **Step 4: Implement the schema and DAO**

Use a compound primary key and stable sortable values:

```kotlin
@Entity(
    tableName = "orders",
    primaryKeys = ["companyId", "orderId"],
    indices = [Index(value = ["companyId", "dateSortKey", "time"])],
)
data class OrderEntity(
    val companyId: String,
    val orderId: String,
    val date: String,
    val dateSortKey: String,
    val time: String,
    val plate: String,
    val customer: String,
    val car: String,
    val type: String,
    val status: String,
    val amountCents: Long,
    val record: String,
    val insuranceExpiry: String,
    val delivery: String,
)
```

```kotlin
@Dao
interface OrderDao {
    @Query("SELECT * FROM orders WHERE companyId = :companyId ORDER BY dateSortKey DESC, time DESC, orderId DESC")
    fun observeByCompany(companyId: String): Flow<List<OrderEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(orders: List<OrderEntity>)

    @Query("DELETE FROM orders WHERE companyId = :companyId")
    suspend fun deleteByCompany(companyId: String)

    @Query("DELETE FROM orders")
    suspend fun clearAll()

    @Transaction
    suspend fun replaceCompany(companyId: String, orders: List<OrderEntity>) {
        deleteByCompany(companyId)
        insertAll(orders)
    }
}
```

Define `@Database(entities = [OrderEntity::class], version = 1, exportSchema = true)` and a `create(context)` factory using database name `autoservice.db`; do not use destructive migration fallback.

- [ ] **Step 5: Compile production and Android tests**

Run: `cd android-client; .\gradlew.bat :app:compileDebugKotlin :app:compileDebugAndroidTestKotlin`

Expected: BUILD SUCCESSFUL and Room schema version 1 exported.

- [ ] **Step 6: Update handoff, commit, and push**

Record Room/KSP versions, schema v1, compiled DAO tests, and the “not run without emulator” status. Commit message: `feat(android): add company scoped orders cache`. Push the current branch.

---

### Task 2: Authenticated orders API and tolerant mapping

**Files:**
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/orders/RepairOrder.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/orders/OrdersApi.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/orders/HttpUrlConnectionOrdersApi.kt`
- Create: `android-client/app/src/test/java/com/chengxu/autoservice/core/orders/HttpUrlConnectionOrdersApiTest.kt`
- Modify: `docs/latest-handoff-prompt.md`

**Interfaces:**
- Produces: `OrdersApi.fetch(token: String): OrdersResult`.
- Produces: `RepairOrder` with `amountCents: Long` and raw plus sortable date fields.

- [ ] **Step 1: Write remote contract tests**

Cover a successful envelope, Bearer header, `401`, `503`, `IOException`, malformed JSON, malformed optional fields, and cancellation propagation. The success fixture must include an unknown field and an amount of `500.25`, expected as `50_025` cents.

```kotlin
@Test
fun successMapsOrdersAndSendsBearerToken() = runTest {
    val transport = FakeOrdersHttpTransport(HttpResponse(200, successJson))
    val result = HttpUrlConnectionOrdersApi("https://chengxu.pages.dev", transport).fetch("session-token")

    assertEquals("Bearer session-token", transport.authorization)
    assertEquals(50_025L, (result as OrdersResult.Success).orders.single().amountCents)
}
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `cd android-client; .\gradlew.bat :app:testDebugUnitTest --tests "*.HttpUrlConnectionOrdersApiTest"`

Expected: FAIL because the orders API types do not exist.

- [ ] **Step 3: Implement domain and result types**

```kotlin
data class RepairOrder(
    val id: String,
    val companyId: String,
    val date: String,
    val dateSortKey: String,
    val time: String,
    val plate: String,
    val customer: String,
    val car: String,
    val type: String,
    val status: String,
    val amountCents: Long,
    val record: String,
    val insuranceExpiry: String,
    val delivery: String,
)

interface OrdersApi { suspend fun fetch(token: String): OrdersResult }

sealed interface OrdersResult {
    data class Success(val orders: List<RepairOrder>) : OrdersResult
    data class Failure(val reason: OrdersFailure) : OrdersResult
}

enum class OrdersFailure { Unauthorized, NetworkUnavailable, ServerError, MalformedResponse }
```

Implement date normalization so `yyyy-MM-dd` is retained, `MM-dd` receives the injected/current year, and invalid text yields an empty sort key. Parse numeric or string amounts into cents with `BigDecimal`, half-up to two decimals; invalid or negative amounts become zero.

- [ ] **Step 4: Implement GET transport and mapping**

`OrdersHttpTransport.get(url, authorization)` must run on `Dispatchers.IO`, set 10-second connect/read timeouts, send `Accept: application/json` and `Authorization: Bearer …`, and always disconnect. Map `200`, `401`, other status codes, `IOException`, and malformed `200` distinctly. Catch and rethrow `CancellationException` before any general failure mapping.

- [ ] **Step 5: Run focused and full JVM tests**

Run: `cd android-client; .\gradlew.bat :app:testDebugUnitTest --tests "*.HttpUrlConnectionOrdersApiTest"`

Run: `cd android-client; .\gradlew.bat :app:testDebugUnitTest`

Expected: BUILD SUCCESSFUL; all remote mapping cases pass.

- [ ] **Step 6: Update handoff, commit, and push**

Record API outcome mapping and test evidence. Commit message: `feat(android): add authenticated orders api`. Push the current branch.

---

### Task 3: Authentication-owned customer-data cleanup

**Files:**
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/auth/AuthenticatedDataCleaner.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/core/auth/AuthenticationRepository.kt`
- Modify: `android-client/app/src/test/java/com/chengxu/autoservice/core/auth/AuthenticationRepositoryTest.kt`
- Modify: `docs/latest-handoff-prompt.md`

**Interfaces:**
- Produces: `fun interface AuthenticatedDataCleaner { suspend fun clear() }`.
- Changes: `AuthenticationRepository` requires a cleaner and invokes it before publishing unauthenticated state.

- [ ] **Step 1: Add failing lifecycle cleanup tests**

Add a recording fake and separate tests proving `restore()` with no valid session, `logout()`, and `invalidate(SessionExpired)` each call `clear()` exactly once before the public session becomes null. Add a cancellation test proving cleaner cancellation escapes and authentication state is not falsely advanced.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `cd android-client; .\gradlew.bat :app:testDebugUnitTest --tests "*.AuthenticationRepositoryTest"`

Expected: FAIL because the repository does not accept or invoke an authenticated-data cleaner.

- [ ] **Step 3: Implement the explicit cleanup boundary**

```kotlin
fun interface AuthenticatedDataCleaner {
    suspend fun clear()
}
```

Require it in the repository constructor. Call `clear()` when restore returns null, during logout, and during invalidation, before publishing `Unauthenticated`. Do not catch `CancellationException`. Keep login persistence behavior unchanged.

- [ ] **Step 4: Update all repository test fixtures and run regression**

Use `AuthenticatedDataCleaner { }` only in tests that are unrelated to cleanup; production wiring must pass the Room-backed implementation explicitly.

Run: `cd android-client; .\gradlew.bat :app:testDebugUnitTest`

Expected: BUILD SUCCESSFUL and authentication regression remains green.

- [ ] **Step 5: Update handoff, commit, and push**

Record the cleanup lifecycle contract. Commit message: `feat(android): clear customer data with auth lifecycle`. Push the current branch.

---

### Task 4: Cache-first orders repository

**Files:**
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/orders/OrdersRepository.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/orders/CachedOrdersRepository.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/orders/cache/RoomOrderCache.kt`
- Create: `android-client/app/src/test/java/com/chengxu/autoservice/core/orders/CachedOrdersRepositoryTest.kt`
- Modify: `docs/latest-handoff-prompt.md`

**Interfaces:**
- Consumes: `OrdersApi.fetch`, `SessionRepository.session`, `NetworkMonitor.connection`, `AuthenticatedDataCleaner`.
- Produces: `OrdersRepository.snapshot: StateFlow<OrdersSnapshot>` and `refresh()`.

- [ ] **Step 1: Write repository behavior tests**

Use fake session/network/API/cache plus a `TestScope`. Prove these independent cases: cached rows emit before a delayed remote response; offline never calls API; successful refresh replaces only current-company rows; failure retains rows and emits stale message; empty failure exposes retry; `401` clears cache then invalidates session; simultaneous refresh calls result in one API call; direct non-null account/company switch clears cache; cancellation escapes.

```kotlin
@Test
fun unauthorizedClearsCacheBeforeInvalidatingSession() = runTest {
    api.result = OrdersResult.Failure(OrdersFailure.Unauthorized)
    repository.refresh()

    assertEquals(listOf("clear", "invalidate"), events)
    assertTrue(repository.snapshot.value.orders.isEmpty())
}
```

- [ ] **Step 2: Run focused tests and verify RED**

Run: `cd android-client; .\gradlew.bat :app:testDebugUnitTest --tests "*.CachedOrdersRepositoryTest"`

Expected: FAIL because repository/cache contracts do not exist.

- [ ] **Step 3: Implement snapshot and cache boundaries**

```kotlin
data class OrdersSnapshot(
    val orders: List<RepairOrder> = emptyList(),
    val syncState: OrderSyncState = OrderSyncState.LoadingCache,
)

sealed interface OrderSyncState {
    data object LoadingCache : OrderSyncState
    data object Ready : OrderSyncState
    data object Refreshing : OrderSyncState
    data class Stale(val message: String) : OrderSyncState
}

interface OrdersRepository {
    val snapshot: StateFlow<OrdersSnapshot>
    suspend fun refresh()
}

interface OrderCache : AuthenticatedDataCleaner {
    fun observe(companyId: String): Flow<List<RepairOrder>>
    suspend fun replace(companyId: String, orders: List<RepairOrder>)
}

fun interface SessionInvalidator {
    suspend fun invalidate()
}
```

`RoomOrderCache.replace` must overwrite every incoming record’s `companyId` with the trusted current-session company before creating entities. Its `clear()` delegates to `OrderDao.clearAll()`.

- [ ] **Step 4: Implement orchestration**

`CachedOrdersRepository` receives `CoroutineScope`, session repository, network monitor, API, cache, and `SessionInvalidator`. Collect session changes with `collectLatest`; switch cache observation without ever emitting the prior company’s rows. Combine distinct session/network pairs to refresh when an authenticated session is online. Use `Mutex.tryLock()` so duplicate triggers do not queue duplicate requests.

Failure copy must be exact:

```kotlin
private fun OrdersFailure.message() = when (this) {
    OrdersFailure.NetworkUnavailable -> "网络异常，当前数据可能不是最新"
    OrdersFailure.ServerError -> "服务器暂时不可用，当前数据可能不是最新"
    OrdersFailure.MalformedResponse -> "工单数据异常，请稍后重试"
    OrdersFailure.Unauthorized -> "登录已过期，请重新登录"
}
```

Unauthorized order: set public rows empty, `cache.clear()`, then invoke `SessionInvalidator.invalidate()`.

- [ ] **Step 5: Run repository and full JVM regression**

Run: `cd android-client; .\gradlew.bat :app:testDebugUnitTest --tests "*.CachedOrdersRepositoryTest"`

Run: `cd android-client; .\gradlew.bat :app:testDebugUnitTest`

Expected: BUILD SUCCESSFUL with all cache/session/network cases green.

- [ ] **Step 6: Update handoff, commit, and push**

Record cache-first ordering, refresh triggers, de-duplication, and unauthorized ordering. Commit message: `feat(android): add cache first orders repository`. Push the current branch.

---

### Task 5: Real workbench metrics and presentation mapping

**Files:**
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/ui/workbench/WorkbenchMetrics.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/ui/workbench/WorkbenchModels.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/ui/workbench/WorkbenchViewModel.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/ui/workbench/WorkbenchComponents.kt`
- Modify: `android-client/app/src/test/java/com/chengxu/autoservice/ui/workbench/WorkbenchViewModelTest.kt`
- Create: `android-client/app/src/test/java/com/chengxu/autoservice/ui/workbench/WorkbenchMetricsTest.kt`
- Delete: `android-client/app/src/main/java/com/chengxu/autoservice/ui/workbench/DemoWorkbenchRepository.kt`
- Delete: `android-client/app/src/main/java/com/chengxu/autoservice/ui/workbench/WorkbenchRepository.kt`
- Modify: `docs/latest-handoff-prompt.md`

**Interfaces:**
- Consumes: `OrdersRepository.snapshot`.
- Produces: role-specific metrics, mapped cards, `syncMessage`, `refreshing`, `showRetry`, and `WorkbenchViewModel.refresh()`.

- [ ] **Step 1: Write deterministic metric tests**

Use fixed date `2026-07-17`. Cover today and `MM-dd` normalization, in-repair/completed/pending status counts, month boundary, pending amount cents, employee 3-day and administrator 7-day insurance windows, expired insurance, invalid dates, descending order, summary fallback, and Chinese money formatting.

```kotlin
@Test
fun administratorMetricsUseRealMonthlyAndPendingValues() {
    val metrics = buildAdministratorMetrics(orders, LocalDate.of(2026, 7, 17))
    assertEquals("¥1,400.25", metrics.single { it.label == "本月产值" }.value)
    assertEquals("2 单待处理", metrics.single { it.label == "待结算金额" }.detail)
}
```

- [ ] **Step 2: Update ViewModel tests and verify RED**

Replace `DemoWorkbenchRepository` with a fake `OrdersRepository`. Assert LoadingCache maps to `loading`, Stale maps to the exact message and retry flag, real orders replace fixed metrics, and `refresh()` delegates once.

Run: `cd android-client; .\gradlew.bat :app:testDebugUnitTest --tests "*.Workbench*Test"`

Expected: FAIL because real mapping and snapshot state are not wired.

- [ ] **Step 3: Implement metrics and card mapping**

Inject `Clock` into `WorkbenchViewModel`, defaulting to `Clock.systemDefaultZone()`. Move all deterministic computation to `WorkbenchMetrics.kt`. Treat insurance expiry as urgent when `expiry` is from today through the inclusive role window, or is earlier than today. Use `NumberFormat` with exactly two decimals only when cents are non-zero.

Order summary rules:

```kotlin
val summary = order.record.ifBlank {
    listOf(order.car, order.type).filter(String::isNotBlank).joinToString(" · ").ifBlank { "暂无维修说明" }
}
```

Map `在修中` to success, `已完工` to primary, `待结算` to warning, `已结算` to neutral/primary; unknown text remains visible and neutral.

- [ ] **Step 4: Wire snapshot state into ViewModel**

Combine session, network, and `OrdersRepository.snapshot`. Add `fun refresh() { viewModelScope.launch { ordersRepository.refresh() } }`. Remove fixed `employeeMetrics` and `adminBusinessMetrics` constants completely.

- [ ] **Step 5: Run workbench and full JVM tests**

Run: `cd android-client; .\gradlew.bat :app:testDebugUnitTest --tests "*.Workbench*Test"`

Run: `cd android-client; .\gradlew.bat :app:testDebugUnitTest`

Expected: BUILD SUCCESSFUL; no test references demo workbench data.

- [ ] **Step 6: Update handoff, commit, and push**

Record exact metric definitions and removal of demo numbers. Commit message: `feat(android): derive workbench from real orders`. Push the current branch.

---

### Task 6: UI state, retry flow, and production assembly

**Files:**
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/MainActivity.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/AutoserviceApp.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/ui/shell/AutoserviceShell.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/navigation/AppNavDisplay.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/ui/workbench/WorkbenchScreen.kt`
- Modify: `android-client/app/src/androidTest/java/com/chengxu/autoservice/WorkbenchScreenTest.kt`
- Modify: `android-client/app/src/androidTest/java/com/chengxu/autoservice/AutoserviceAppTest.kt`
- Modify: `docs/latest-handoff-prompt.md`

**Interfaces:**
- Consumes: database/cache/API/repository constructors and `WorkbenchViewModel.refresh()`.
- Produces: production wiring and visible loading/stale/empty/retry behavior.

- [ ] **Step 1: Add UI tests before changing the screen**

Add Compose tests for: empty stale state shows the message plus “重新同步”; cached stale state keeps an order card visible; Refreshing keeps cards visible and shows “正在同步”; clicking retry invokes exactly once. Update app fixture constructors for the new repository contract.

- [ ] **Step 2: Compile Android tests and verify RED**

Run: `cd android-client; .\gradlew.bat :app:compileDebugAndroidTestKotlin`

Expected: FAIL because refresh callback and sync UI do not exist.

- [ ] **Step 3: Propagate the refresh callback**

Add `onWorkbenchRefresh: () -> Unit` through `AutoserviceShell` and `AppNavDisplay`; call `WorkbenchScreen(state, onAction, onRefresh)`. In `AuthenticatedRoot`, pass `workbenchViewModel::refresh`.

- [ ] **Step 4: Implement sync and empty presentation**

When rows exist, never replace them with a full-screen progress indicator. Above “近期工单”, show the sync/stale message and an enabled `OutlinedButton("重新同步")` for stale states. When rows are empty and loading is false, show “暂无工单数据”; when stale, keep the error and retry visible. Use only existing spacing, typography, and approved color roles.

- [ ] **Step 5: Replace production demo assembly**

In `MainActivity`, create in this order: Room database/DAO, one `RoomOrderCache`, `AuthenticationRepository` with that cleaner, network monitor, `HttpUrlConnectionOrdersApi`, and `CachedOrdersRepository` using `lifecycleScope`. Use:

```kotlin
sessionInvalidator = SessionInvalidator {
    authenticationRepository.invalidate(AuthFailure.SessionExpired)
}
```

Pass the production orders repository into `AutoserviceApp`. No demo repository may remain in main source.

- [ ] **Step 6: Compile, test, and lint**

Run: `cd android-client; .\gradlew.bat :app:testDebugUnitTest :app:compileDebugAndroidTestKotlin :app:lintDebug`

Expected: BUILD SUCCESSFUL. Do not run connected tests or start an emulator.

- [ ] **Step 7: Update handoff, commit, and push**

Record production assembly and compiled UI scenarios. Commit message: `feat(android): wire cached orders workbench`. Push the current branch.

---

### Task 7: Final verification, documentation, and installable APK

**Files:**
- Modify: `docs/android-client.md`
- Modify: `docs/latest-handoff-prompt.md`
- Generate ignored artifact: `dist/releases/android/autoservice-android-debug-0.1.0.apk`

**Interfaces:**
- Verifies all preceding tasks as a single production build.
- Produces a real-device checklist and a hashed installable APK.

- [ ] **Step 1: Run clean verification without an emulator**

Run from `android-client` with the configured JDK/SDK:

```powershell
.\gradlew.bat clean :app:testDebugUnitTest :app:compileDebugAndroidTestKotlin :app:lintDebug :app:assembleDebug --rerun-tasks
```

Expected: BUILD SUCCESSFUL; JVM tests, Android test compilation, Lint, and APK assembly all pass.

- [ ] **Step 2: Inspect objective reports**

Confirm JVM XML contains zero failures/errors/skips, Android test Kotlin compilation completed, and Lint has no fatal issues. Confirm no source reference remains:

```powershell
rg -n "DemoWorkbenchRepository|今日接车.*,.*12|本月产值.*,.*286,400" app/src
```

Expected: no matches.

- [ ] **Step 3: Publish and hash the APK**

Copy `android-client/app/build/outputs/apk/debug/app-debug.apk` to `dist/releases/android/autoservice-android-debug-0.1.0.apk`, then run `Get-FileHash -Algorithm SHA256` and record byte size plus hash. The ignored APK is not staged.

- [ ] **Step 4: Update real-device documentation**

Add checks for: cache-first relaunch, online refresh, airplane-mode cached view, empty-cache offline state, network recovery auto-refresh, both companies, logout cache clearing, expired-session return to login, real metrics, and no write affordance introduced by this milestone.

- [ ] **Step 5: Update handoff with final evidence**

Record test counts, Gradle task result, Lint result, APK absolute path/size/SHA-256, remaining real-device checks, and the next product milestone. Do not claim Room instrumentation execution; state that its code compiled but was not run because no emulator was started.

- [ ] **Step 6: Commit and push**

Commit only source/docs/schema changes with message `docs(android): verify cached orders release`. Push the current branch and confirm local HEAD equals `origin/codex/android-mobile-ui-atlas`.

---

## Plan Self-Review

- Spec coverage: remote authentication, Room isolation, cache-first display, atomic replacement, offline behavior, 401 invalidation, lifecycle clearing, real metrics, UI states, test compilation, Lint, APK, and handoff discipline each have an owning task.
- Placeholder scan: the plan contains no deferred implementation markers; every behavior has an exact type, copy string, command, or test assertion.
- Type consistency: `RepairOrder`, `OrdersResult`, `OrderCache`, `OrdersSnapshot`, `OrdersRepository`, `AuthenticatedDataCleaner`, and `SessionInvalidator` are introduced before their consumers and keep the same signatures throughout.
