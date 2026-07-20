# Android Read-Only Orders Center Implementation Plan

> **Execution mode:** Use `superpowers:executing-plans` to implement this plan task-by-task in the current workspace. The user has explicitly selected inline execution, so do not create subagents or a worktree. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Android orders placeholder with a real cached order list, local search/status filtering, and read-only detail navigation from both the orders tab and workbench.

**Architecture:** Add one session-scoped `OrdersViewModel` over the existing `OrdersRepository.snapshot`, with pure presentation mapping and filtering. Render the list and detail as separate Compose screens while keeping Navigation 3’s independent per-tab stacks. Reuse the current API/Room data and authentication lifecycle without schema changes or write operations.

**Tech Stack:** Kotlin 2.3.0, Jetpack Compose Material 3, Navigation 3, StateFlow/coroutines, JUnit 4, AndroidX Compose UI Test, Gradle 8.10.2, Android API 26+.

## Global Constraints

- Use only fields already present in `RepairOrder`; do not change `/api/orders`, Room Schema, or database version.
- Keep the milestone strictly read-only: no create, edit, delete, status advance, settlement, void, receipt, or offline write action.
- Search locally across ID, plate, customer, car, and record; do not send search requests.
- Filters are exactly `全部 / 在修中 / 已完工 / 待结算 / 已结算`; unknown statuses remain visible under `全部`.
- Preserve repository date/time/ID order and existing company isolation, logout cleanup, 401 invalidation, and cancellation behavior.
- Cards, filter controls, retry, clear-filter, back, and other interactive controls have at least 48dp touch height.
- Reuse current brand tokens, shapes, components, and local Hugeicons; add no raster assets.
- Do not start an Android emulator or claim connected Android tests ran; compile their source and build the APK.
- Update `docs/latest-handoff-prompt.md`, commit, and push after each important milestone.

---

### Task 1: Presentation mapping, filtering, and session-scoped OrdersViewModel

**Files:**
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/ui/orders/OrdersModels.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/ui/orders/OrdersMapping.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/ui/orders/OrdersViewModel.kt`
- Create: `android-client/app/src/test/java/com/chengxu/autoservice/ui/orders/OrdersMappingTest.kt`
- Create: `android-client/app/src/test/java/com/chengxu/autoservice/ui/orders/OrdersViewModelTest.kt`
- Modify: `docs/latest-handoff-prompt.md`

**Interfaces:**
- Consumes: `OrdersRepository.snapshot: StateFlow<OrdersSnapshot>` and `OrdersRepository.refresh()`.
- Produces: `OrderStatusFilter`, `OrderStatusTone`, `OrderDisplayModel`, `OrdersUiState`, `mapOrder`, `filterOrders`, and `OrdersViewModel`.

- [x] **Step 1: Write failing mapping tests**

Create tests that construct real `RepairOrder` values and assert these exact contracts:

```kotlin
@Test
fun mapOrderUsesSafeFallbacksAndPreservesUnknownStatus() {
    val item = mapOrder(order(status = "厂家待件", record = "", car = "帕萨特", type = "事故维修"))

    assertEquals("厂家待件", item.status)
    assertEquals(OrderStatusTone.NEUTRAL, item.statusTone)
    assertEquals("帕萨特 · 事故维修", item.serviceSummary)
    assertEquals("¥1,234.56", item.amountLabel)
    assertEquals("未填写", item.delivery)
    assertEquals("未填写", item.insuranceExpiry)
}

@Test
fun searchAndStatusFilterIntersectWithoutChangingOrder() {
    val rows = listOf(
        mapOrder(order(id = "RO-3", plate = "蒙A33333", customer = "王女士", status = "待结算")),
        mapOrder(order(id = "RO-2", plate = "蒙A22222", customer = "张先生", status = "在修中")),
        mapOrder(order(id = "RO-1", plate = "蒙A11111", customer = "张先生", status = "待结算")),
    )

    val result = filterOrders(rows, query = " 张先生 ", filter = OrderStatusFilter.PENDING_SETTLEMENT)

    assertEquals(listOf("RO-1"), result.map { it.id })
}
```

Also cover matches by ID, plate, car, record, case-insensitive Latin text, blank query, every fixed status, and unknown status visible only in `ALL`.

- [x] **Step 2: Run mapping tests and verify RED**

Run from `android-client/`:

```powershell
.\gradlew.bat :app:testDebugUnitTest --tests "*OrdersMappingTest"
```

Expected: compilation fails because the `ui.orders` presentation types and functions do not exist.

- [x] **Step 3: Implement the presentation models**

Create these exact public-to-module contracts:

```kotlin
enum class OrderStatusFilter(val label: String, val status: String?) {
    ALL("全部", null),
    REPAIRING("在修中", "在修中"),
    COMPLETED("已完工", "已完工"),
    PENDING_SETTLEMENT("待结算", "待结算"),
    SETTLED("已结算", "已结算"),
}

enum class OrderStatusTone { PRIMARY, SUCCESS, WARNING, NEUTRAL }

data class OrderDisplayModel(
    val id: String,
    val plate: String,
    val customer: String,
    val car: String,
    val type: String,
    val status: String,
    val statusTone: OrderStatusTone,
    val serviceSummary: String,
    val record: String,
    val date: String,
    val time: String,
    val dateTimeLabel: String,
    val amountLabel: String,
    val insuranceExpiry: String,
    val delivery: String,
)

data class OrdersUiState(
    val loading: Boolean = true,
    val refreshing: Boolean = false,
    val syncMessage: String? = null,
    val showRetry: Boolean = false,
    val query: String = "",
    val selectedFilter: OrderStatusFilter = OrderStatusFilter.ALL,
    val allOrders: List<OrderDisplayModel> = emptyList(),
    val visibleOrders: List<OrderDisplayModel> = emptyList(),
) {
    val totalCount: Int get() = allOrders.size
    val visibleCount: Int get() = visibleOrders.size
    val hasActiveFilters: Boolean get() = query.isNotBlank() || selectedFilter != OrderStatusFilter.ALL
}
```

Implement `mapOrder(order: RepairOrder)` with the approved money, status, summary, and `未填写` fallbacks. Implement `filterOrders(rows, query, filter)` by trimming/lowercasing the query with `Locale.ROOT`, checking all five approved fields, intersecting the fixed status, and retaining input order.

- [x] **Step 4: Run mapping tests and verify GREEN**

Run the focused mapping command again. Expected: all `OrdersMappingTest` cases pass with Gradle exit code 0.

- [x] **Step 5: Write failing OrdersViewModel tests**

Use a `MutableStateFlow<OrdersSnapshot>` fake repository and `UnconfinedTestDispatcher`. Cover:

```kotlin
@Test
fun queryAndStatusSurviveRepositoryRefresh() = runTest {
    val repository = FakeOrdersRepository(OrdersSnapshot(
        orders = listOf(order(id = "RO-1", customer = "张先生", status = "待结算")),
        syncState = OrderSyncState.Ready,
    ))
    val viewModel = OrdersViewModel(repository)

    viewModel.updateQuery("张先生")
    viewModel.selectFilter(OrderStatusFilter.PENDING_SETTLEMENT)
    repository.emit(OrdersSnapshot(
        orders = listOf(order(id = "RO-2", customer = "张先生", status = "待结算")),
        syncState = OrderSyncState.Refreshing,
    ))

    val state = viewModel.uiState.first { it.visibleOrders.singleOrNull()?.id == "RO-2" }
    assertEquals("张先生", state.query)
    assertEquals(OrderStatusFilter.PENDING_SETTLEMENT, state.selectedFilter)
    assertTrue(state.refreshing)
}

@Test
fun refreshDelegatesExactlyOnce() = runTest {
    val repository = FakeOrdersRepository(OrdersSnapshot(syncState = OrderSyncState.Ready))
    val viewModel = OrdersViewModel(repository)

    viewModel.refresh()
    advanceUntilIdle()

    assertEquals(1, repository.refreshCount)
}
```

Also assert `LoadingCache`, `Stale`, true empty list, no-match state via active filters, clear filters, and that `allOrders` no longer contains an ID removed by a later snapshot.

- [x] **Step 6: Run ViewModel tests and verify RED**

```powershell
.\gradlew.bat :app:testDebugUnitTest --tests "*OrdersViewModelTest"
```

Expected: compilation fails because `OrdersViewModel` does not exist.

- [x] **Step 7: Implement OrdersViewModel**

Use two private flows and one combined eagerly-started state:

```kotlin
class OrdersViewModel(
    private val ordersRepository: OrdersRepository,
) : ViewModel() {
    private val query = MutableStateFlow("")
    private val selectedFilter = MutableStateFlow(OrderStatusFilter.ALL)

    val uiState: StateFlow<OrdersUiState> = combine(
        ordersRepository.snapshot,
        query,
        selectedFilter,
    ) { snapshot, currentQuery, currentFilter ->
        val allOrders = snapshot.orders.map(::mapOrder)
        OrdersUiState(
            loading = snapshot.syncState == OrderSyncState.LoadingCache,
            refreshing = snapshot.syncState == OrderSyncState.Refreshing,
            syncMessage = (snapshot.syncState as? OrderSyncState.Stale)?.message,
            showRetry = snapshot.syncState is OrderSyncState.Stale,
            query = currentQuery,
            selectedFilter = currentFilter,
            allOrders = allOrders,
            visibleOrders = filterOrders(allOrders, currentQuery, currentFilter),
        )
    }.stateIn(viewModelScope, SharingStarted.Eagerly, OrdersUiState())

    fun updateQuery(value: String) { query.value = value }
    fun selectFilter(value: OrderStatusFilter) { selectedFilter.value = value }
    fun clearFilters() {
        query.value = ""
        selectedFilter.value = OrderStatusFilter.ALL
    }
    fun refresh() { viewModelScope.launch { ordersRepository.refresh() } }
}
```

- [x] **Step 8: Run focused and full JVM tests**

```powershell
.\gradlew.bat :app:testDebugUnitTest --tests "*OrdersMappingTest" --tests "*OrdersViewModelTest"
.\gradlew.bat :app:testDebugUnitTest
```

Expected: focused tests and the complete JVM suite both exit successfully with zero failures.

- [x] **Step 9: Update handoff, commit, and push Task 1**

Record RED/GREEN evidence in `docs/latest-handoff-prompt.md`, then commit `OrdersModels.kt`, `OrdersMapping.kt`, `OrdersViewModel.kt`, both test files, and the handoff update:

```powershell
git add android-client/app/src/main/java/com/chengxu/autoservice/ui/orders android-client/app/src/test/java/com/chengxu/autoservice/ui/orders docs/latest-handoff-prompt.md docs/superpowers/plans/2026-07-20-android-read-only-orders-center.md
git commit -m "feat(android): add orders presentation state"
git push origin codex/android-mobile-ui-atlas
```

---

### Task 2: Real cached orders list screen

**Files:**
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/ui/orders/OrdersScreen.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/ui/orders/OrdersComponents.kt`
- Create: `android-client/app/src/androidTest/java/com/chengxu/autoservice/OrdersScreenTest.kt`
- Modify: `docs/latest-handoff-prompt.md`

**Interfaces:**
- Consumes: `OrdersUiState`, `isOffline`, and callbacks for query, filter, clear, refresh, and order selection.
- Produces: `OrdersScreen(state, isOffline, onQueryChange, onFilterSelected, onClearFilters, onRefresh, onOrderSelected)` and stable `OrdersTestTags`.

- [ ] **Step 1: Write failing Compose source contracts**

Create Android tests that call the wished-for screen and assert:

```kotlin
composeRule.onNodeWithText("工单").assertIsDisplayed()
composeRule.onNodeWithText("共 2 单").assertIsDisplayed()
composeRule.onNodeWithText("蒙A12345 · 张先生")
    .assertHasClickAction()
    .assertHeightIsAtLeast(48.dp)
composeRule.onNodeWithTag("${OrdersTestTags.FILTER_PREFIX}待结算").performClick()
composeRule.onNodeWithText("RO-SETTLED").assertDoesNotExist()
composeRule.onNodeWithText("RO-PENDING").assertIsDisplayed()
```

Add cases for query callback, loading, refreshing with retained cards, stale with retry once, true empty, no match with clear filters, unknown status under all, and offline retry hidden/disabled. Use test tags for search, filter items, order cards, retry, and clear filters.

- [ ] **Step 2: Compile Android tests and verify RED**

```powershell
.\gradlew.bat :app:compileDebugAndroidTestKotlin
```

Expected: compilation fails because `OrdersScreen` and `OrdersTestTags` do not exist.

- [ ] **Step 3: Implement the list components**

`OrdersComponents.kt` must provide:

- a full-width clickable `OrderCard` using the existing Surface/card shape, local `Orders`/`ArrowRight`/`Calendar`/`Wallet` Hugeicons, and mapped status tone;
- a horizontally scrolling fixed filter row whose selected item uses Ice/Ink and whose controls are at least 48dp tall;
- a compact sync message panel with optional secondary “重新同步” button;
- centered business-empty and no-match states with the exact approved copy.

Map `OrderStatusTone` to design-system `StatusTone` in this UI-only file. Do not add any write control.

- [ ] **Step 4: Implement OrdersScreen**

Use a Canvas background and `LazyColumn` with 16dp horizontal padding. The header shows `工单` and `共 N 单`; the existing `BrandTextField` is labeled `搜索工单号、车牌、客户`. Render filters above the sync state. Apply this decision table exactly:

```kotlin
when {
    state.loading && state.allOrders.isEmpty() -> LoadingOrdersState()
    state.allOrders.isEmpty() && state.syncMessage != null -> ErrorOrdersState(...)
    state.allOrders.isEmpty() -> EmptyOrdersState()
    state.visibleOrders.isEmpty() -> NoMatchingOrdersState(onClearFilters)
    else -> state.visibleOrders.forEach { OrderCard(it, onOrderSelected) }
}
```

Continue showing sync status above non-empty results. Do not expose retry while `isOffline` is true.

- [ ] **Step 5: Compile Android tests and run JVM regression**

```powershell
.\gradlew.bat :app:compileDebugAndroidTestKotlin :app:testDebugUnitTest
```

Expected: Android test Kotlin compiles and the full JVM suite passes. Do not claim device execution.

- [ ] **Step 6: Update handoff, commit, and push Task 2**

Record list states and compile evidence, then:

```powershell
git add android-client/app/src/main/java/com/chengxu/autoservice/ui/orders/OrdersScreen.kt android-client/app/src/main/java/com/chengxu/autoservice/ui/orders/OrdersComponents.kt android-client/app/src/androidTest/java/com/chengxu/autoservice/OrdersScreenTest.kt docs/latest-handoff-prompt.md
git commit -m "feat(android): build cached orders list"
git push origin codex/android-mobile-ui-atlas
```

---

### Task 3: Read-only detail, workbench entry, Navigation 3 wiring, and production assembly

**Files:**
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/ui/orders/OrderDetailScreen.kt`
- Create: `android-client/app/src/androidTest/java/com/chengxu/autoservice/OrderDetailScreenTest.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/ui/workbench/WorkbenchScreen.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/navigation/AppNavDisplay.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/ui/shell/AutoserviceShell.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/AutoserviceApp.kt`
- Modify: `android-client/app/src/androidTest/java/com/chengxu/autoservice/WorkbenchScreenTest.kt`
- Modify: `android-client/app/src/androidTest/java/com/chengxu/autoservice/AutoserviceShellTest.kt`
- Modify: `android-client/app/src/androidTest/java/com/chengxu/autoservice/AutoserviceAppTest.kt`
- Modify: `docs/latest-handoff-prompt.md`

**Interfaces:**
- Consumes: `OrdersUiState.allOrders`, `AppRoute.OrderDetail(orderId)`, existing `AppNavigationState.push/pop`, and session-scoped owner.
- Produces: `OrderDetailScreen(order, onBack)`, workbench `onOrderSelected(orderId)`, orders callbacks through shell/nav display, and an `OrdersViewModel` production factory.

- [ ] **Step 1: Write failing detail Compose tests**

Cover a populated detail and a missing detail. Assert exact section labels and 48dp back action:

```kotlin
composeRule.onNodeWithText("工单详情").assertIsDisplayed()
composeRule.onNodeWithText("蒙A12345").assertIsDisplayed()
listOf("工单信息", "车辆与服务", "交付与保障", "费用").forEach {
    composeRule.onNodeWithText(it).assertIsDisplayed()
}
composeRule.onNodeWithText("¥1,234.56").assertIsDisplayed()
composeRule.onNodeWithContentDescription("返回").assertHeightIsAtLeast(48.dp)
```

Missing order must show `工单不存在或已失效` and a clickable `返回工单列表` control. Assert no text matching `新增工单`, `编辑`, `推进状态`, or `办理结算` exists.

- [ ] **Step 2: Write failing navigation and workbench contracts**

- Update `WorkbenchScreenTest` to pass `onOrderSelected`, click a recent card, and assert the real ID is emitted once instead of a Snackbar.
- Update `AutoserviceShellTest` to provide a non-empty `OrdersUiState`, select the orders tab, open `OrderDetail`, return, then open the same ID from workbench and verify each tab’s stack remains independent.
- Update `AutoserviceAppTest` fixtures for the new production shell parameters.

Compile and expect failures for missing callbacks/screens:

```powershell
.\gradlew.bat :app:compileDebugAndroidTestKotlin
```

- [ ] **Step 3: Implement OrderDetailScreen**

Use a Canvas background, a 48dp back `IconButton`, a scrollable column, and brand Surfaces. Render the approved overview and four exact sections. Use `StatusChip` and local icons. Every blank field is already normalized by `OrderDisplayModel`; do not read `RepairOrder` directly and do not render action buttons.

The signature is:

```kotlin
@Composable
fun OrderDetailScreen(
    order: OrderDisplayModel?,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
)
```

- [ ] **Step 4: Replace workbench placeholder click with navigation callback**

Change `WorkbenchScreen` to accept `onOrderSelected: (String) -> Unit = {}` and call it with `order.orderNumber`. Remove the coroutine Snackbar text ending in `详情将在后续阶段接入`. Keep permission-denial Snackbar behavior unchanged.

- [ ] **Step 5: Wire list/detail routes through Navigation 3**

Extend `AppNavDisplay` and `AutoserviceShell` with `ordersState`, query/filter/clear/refresh callbacks. In `AppNavDisplay`:

```kotlin
AppRoute.Orders -> OrdersScreen(
    state = ordersState,
    isOffline = isOffline,
    onQueryChange = onOrdersQueryChange,
    onFilterSelected = onOrdersFilterSelected,
    onClearFilters = onOrdersClearFilters,
    onRefresh = onOrdersRefresh,
    onOrderSelected = { navigationState.push(AppRoute.OrderDetail(it)) },
)
is AppRoute.OrderDetail -> OrderDetailScreen(
    order = ordersState.allOrders.firstOrNull { it.id == entry.orderId },
    onBack = navigationState::pop,
)
```

Pass the same push callback into `WorkbenchScreen`. Preserve all existing quick-action routes and five-tab behavior.

- [ ] **Step 6: Assemble OrdersViewModel in the authenticated session**

Create `OrdersViewModel` with the existing `sessionViewModelStoreOwner`, collect `ordersState`, and pass its callbacks to `AutoserviceShell`. Add a factory parallel to `workbenchViewModelFactory`:

```kotlin
private fun ordersViewModelFactory(
    ordersRepository: OrdersRepository,
): ViewModelProvider.Factory = object : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(OrdersViewModel::class.java)) {
            return OrdersViewModel(ordersRepository) as T
        }
        throw IllegalArgumentException("Unsupported ViewModel class: ${modelClass.name}")
    }
}
```

- [ ] **Step 7: Run focused navigation/UI compilation and full JVM tests**

```powershell
.\gradlew.bat :app:testDebugUnitTest --tests "*AppNavigationStateTest" --tests "*OrdersViewModelTest"
.\gradlew.bat :app:compileDebugAndroidTestKotlin :app:testDebugUnitTest :app:lintDebug :app:assembleDebug
```

Expected: focused JVM tests pass; Android test Kotlin compiles; full JVM, Lint, and Debug APK tasks exit successfully. No emulator is started.

- [ ] **Step 8: Review scope and remove placeholders**

Run:

```powershell
rg -n "工单列表正在升级|详情将在后续阶段接入|ShellPlaceholder\(title = \"工单详情\"\)|新增工单|办理结算" app/src/main app/src/androidTest
```

Expected: the orders list/detail placeholder strings are absent from their former routes; any remaining `新增工单` or `办理结算` matches belong only to existing workbench/create-stage permission flows, never to `ui/orders`.

- [ ] **Step 9: Update handoff, commit, and push Task 3**

```powershell
git add android-client/app/src/main/java/com/chengxu/autoservice/ui/orders/OrderDetailScreen.kt android-client/app/src/main/java/com/chengxu/autoservice/ui/workbench/WorkbenchScreen.kt android-client/app/src/main/java/com/chengxu/autoservice/navigation/AppNavDisplay.kt android-client/app/src/main/java/com/chengxu/autoservice/ui/shell/AutoserviceShell.kt android-client/app/src/main/java/com/chengxu/autoservice/AutoserviceApp.kt android-client/app/src/androidTest/java/com/chengxu/autoservice/OrderDetailScreenTest.kt android-client/app/src/androidTest/java/com/chengxu/autoservice/WorkbenchScreenTest.kt android-client/app/src/androidTest/java/com/chengxu/autoservice/AutoserviceShellTest.kt android-client/app/src/androidTest/java/com/chengxu/autoservice/AutoserviceAppTest.kt docs/latest-handoff-prompt.md
git commit -m "feat(android): add read-only order details"
git push origin codex/android-mobile-ui-atlas
```

---

### Task 4: Clean verification, real-device checklist, and installable APK

**Files:**
- Modify: `docs/android-client.md`
- Modify: `docs/latest-handoff-prompt.md`
- Replace: `dist/releases/android/autoservice-android-debug-0.1.0.apk`

**Interfaces:**
- Consumes: completed list/detail implementation and all existing tests.
- Produces: verified API 26+ Debug APK and an exact real-device orders-center checklist.

- [ ] **Step 1: Run full clean verification**

```powershell
.\gradlew.bat clean :app:testDebugUnitTest :app:compileDebugAndroidTestKotlin :app:lintDebug :app:assembleDebug --rerun-tasks
```

Expected: `BUILD SUCCESSFUL`; all JVM tests pass; Android test Kotlin compiles; Lint has zero Fatal and zero Error; Debug APK exists. Read actual task/test/Lint counts from output and XML.

- [ ] **Step 2: Update the real-device checklist**

Add checks for:

- true production list count/order and status chips;
- search by ID, plate, customer, car, and record;
- fixed status filters, unknown status under all, and clear-filter behavior;
- cached offline list/detail and disabled retry;
- refresh-in-place and stale-data retry;
- details opened from both root tabs with correct back stacks;
- missing detail after refresh;
- absence of write controls;
- 360dp width, large font, keyboard, horizontal filter scrolling, and 48dp controls.

- [ ] **Step 3: Copy, hash, and verify APK**

Copy `android-client/app/build/outputs/apk/debug/app-debug.apk` over the tracked release APK. Compare both SHA-256 hashes and run Android SDK `apksigner verify --verbose`. Expected: hashes match and v2 signing verifies.

- [ ] **Step 4: Perform final code/spec review**

Re-read `docs/superpowers/specs/2026-07-20-android-read-only-orders-center-design.md`. Confirm every requirement maps to source, JVM evidence, compiled Android test code, or a real-device checklist item. Record explicitly that native visual comparison and connected tests were not performed because no emulator was started.

- [ ] **Step 5: Update handoff, commit, and push release**

Record exact verification counts, APK size/hash/signature, and limitations, then:

```powershell
git add docs/android-client.md docs/latest-handoff-prompt.md dist/releases/android/autoservice-android-debug-0.1.0.apk
git commit -m "build(android): release read-only orders APK"
git push origin codex/android-mobile-ui-atlas
```

- [ ] **Step 6: Confirm repository state**

Run `git status --short --branch`, `git rev-parse HEAD`, and `git rev-parse origin/codex/android-mobile-ui-atlas`. Expected: clean worktree and identical local/remote hashes.
