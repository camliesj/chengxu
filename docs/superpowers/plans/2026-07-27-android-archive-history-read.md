# Android 已结算历史档案中心第一批 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Android“档案”标签交付为企业隔离、缓存优先、只读的已结算工单历史查询中心。

**Architecture:** 新增独立的历史读取 API 与仓库，复用服务端 `GET /api/orders?scope=history`、现有 `order_summaries` 的 `HISTORY` scope 以及加密详情缓存。历史 ViewModel 与 Compose 页面不复用当前工单的写入状态；导航仅允许历史卡片进入现有详情路由，并显式屏蔽所有写入入口。

**Tech Stack:** Kotlin、Coroutines/Flow、Room、Jetpack Compose、Navigation 3、JUnit、Android Compose 测试源码。

## Global Constraints

- 仅当前会话企业可读取或缓存历史；Token、手机号、VIN 不写入日志或测试输出。
- 离线不发网络请求；401 使用共享 `SessionInvalidator` 清理客户缓存并失效会话。
- 不新增 Room/D1 migration，不访问远程 D1/Pages，不改生产 capability，不启动模拟器或 connected Android 测试。
- 历史中心全程只读：不得显示编辑、状态推进、结算、返结算、作废或回执入口。
- 每个完成的任务更新 `docs/latest-handoff-prompt.md`、提交并推送当前分支；最终刷新并签名 Debug APK。

---

### Task 1: 历史分页 HTTP 契约

**Files:**
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/orders/HistoryOrdersApi.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/orders/HttpUrlConnectionHistoryOrdersApi.kt`
- Create: `android-client/app/src/test/java/com/chengxu/autoservice/core/orders/HttpUrlConnectionHistoryOrdersApiTest.kt`

**Interfaces:**
- Consumes: `OrdersHttpTransport`, `OrdersHttpResponse`, `OrderSummary`, `asOrderSummaryOrNull`。
- Produces: `HistoryOrdersApi.fetch(token: String, cursor: String?): HistoryOrdersResult`；成功结果包含 `orders: List<OrderSummary>` 与 `nextCursor: String?`。

- [x] **Step 1: 写失败的 HTTP 合同测试。**

```kotlin
val result = api.fetch(token = "session-token", cursor = "next-cursor")
assertEquals(
    "https://chengxu.pages.dev/api/orders?scope=history&cursor=next-cursor",
    transport.url,
)
assertEquals("Bearer session-token", transport.authorization)
```

覆盖首个请求、游标 URL 编码、200 分页映射、401、5xx、IO、畸形 JSON 与 `CancellationException` 原样传播；断言不接受缺少 `id/companyId/version/updatedAt` 的摘要。

- [x] **Step 2: 运行聚焦测试确认 RED。**

Run: `cd android-client; .\gradlew.bat :app:testDebugUnitTest --tests "*HttpUrlConnectionHistoryOrdersApiTest"`

Expected: FAIL，原因是 `HistoryOrdersApi` 与 HTTP 实现尚不存在。

- [x] **Step 3: 实现最小历史 API。**

```kotlin
interface HistoryOrdersApi {
    suspend fun fetch(token: String, cursor: String?): HistoryOrdersResult
}

sealed interface HistoryOrdersResult {
    data class Success(val orders: List<OrderSummary>, val nextCursor: String?) : HistoryOrdersResult
    data class Failure(val reason: OrdersFailure) : HistoryOrdersResult
}
```

仅构造 `/api/orders?scope=history`，有游标时追加 URL 编码后的 `cursor`。复用已有 transport、超时与 failure 映射；只映射合法摘要，缺少 `orders` 数组或解析异常返回 `MalformedResponse`。

- [x] **Step 4: 运行聚焦测试确认 GREEN。**

Run: `cd android-client; .\gradlew.bat :app:testDebugUnitTest --tests "*HttpUrlConnectionHistoryOrdersApiTest"`

Expected: PASS。

- [x] **Step 5: 检查差异并提交推送。**

Run: `git diff --check`

Commit: `feat(android): add history orders api`

### Task 2: 企业隔离历史缓存与分页仓库

**Files:**
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/core/orders/cache/OrderDao.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/core/orders/cache/RoomOrderCache.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/orders/HistoryOrdersRepository.kt`
- Create: `android-client/app/src/test/java/com/chengxu/autoservice/core/orders/HistoryOrdersRepositoryTest.kt`
- Modify: `android-client/app/src/test/java/com/chengxu/autoservice/core/orders/cache/OrderDaoTest.kt`

**Interfaces:**
- Consumes: `HistoryOrdersApi`, `SessionRepository`, `NetworkMonitor`, `SessionInvalidator`, `OrderDao`。
- Produces: `HistoryOrdersRepository.snapshot: StateFlow<HistoryOrdersSnapshot>`；`refresh()` 与 `loadNextPage()`；`RoomOrderCache.observeHistory(companyId)`、`replaceHistory(companyId, rows)`、`appendHistory(companyId, rows)`。

- [ ] **Step 1: 写失败的仓库与 DAO 测试。**

```kotlin
repository.refresh()
assertEquals(listOf("H-1"), repository.snapshot.value.orders.map { it.id })
assertEquals("cursor-2", repository.snapshot.value.nextCursor)
repository.loadNextPage()
assertEquals(listOf("H-1", "H-2"), repository.snapshot.value.orders.map { it.id })
```

覆盖缓存先显示、离线零 HTTP、首刷替换、后页按 `companyId + orderId` 去重、外来 company 摘要不落库、网络/5xx/畸形结果保留缓存、并发刷新去重、401 按“清缓存后失效会话”顺序执行、账号或企业切换清理及取消传播。DAO 测试锁定 `HISTORY` 与 `CURRENT` 不互删。

- [ ] **Step 2: 运行聚焦测试确认 RED。**

Run: `cd android-client; .\gradlew.bat :app:testDebugUnitTest --tests "*HistoryOrdersRepositoryTest" --tests "*OrderDaoTest"`

Expected: FAIL，原因是历史缓存接口及仓库尚不存在。

- [ ] **Step 3: 实现范围感知的缓存和仓库。**

```kotlin
data class HistoryOrdersSnapshot(
    val orders: List<OrderSummary> = emptyList(),
    val nextCursor: String? = null,
    val syncState: OrderSyncState = OrderSyncState.LoadingCache,
    val loadingNextPage: Boolean = false,
)
```

为 DAO 增加仅删除当前企业 `scope = 'HISTORY'` 的事务查询；首刷替换历史 scope，后页只 upsert 历史 scope。仓库只在 `ConnectionState.Online` 调用 API，验证每个 `OrderSummary.companyId == session.companyId` 后才写入；无下一页、刷新中或分页中不重复请求。401 调用已有清理/失效边界，不自行保留旧会话状态。

- [ ] **Step 4: 运行聚焦测试确认 GREEN。**

Run: `cd android-client; .\gradlew.bat :app:testDebugUnitTest --tests "*HistoryOrdersRepositoryTest" --tests "*OrderDaoTest"`

Expected: PASS。

- [ ] **Step 5: 检查差异并提交推送。**

Run: `git diff --check`

Commit: `feat(android): cache history order pages`

### Task 3: 历史档案 ViewModel 与只读 Compose 页面

**Files:**
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/ui/records/HistoryRecordsModels.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/ui/records/HistoryRecordsViewModel.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/ui/records/HistoryRecordsScreen.kt`
- Create: `android-client/app/src/test/java/com/chengxu/autoservice/ui/records/HistoryRecordsViewModelTest.kt`
- Create: `android-client/app/src/androidTest/java/com/chengxu/autoservice/ui/records/HistoryRecordsScreenTest.kt`

**Interfaces:**
- Consumes: `HistoryOrdersRepository`、`OrderDisplayModel` 映射规则及 `ConnectionState`。
- Produces: `HistoryRecordsUiState`（查询、筛选、缓存状态、分页状态、可见历史列表）与 `HistoryRecordsTestTags`。

- [ ] **Step 1: 写失败的 ViewModel 和 Compose 测试源码。**

```kotlin
viewModel.updateQuery("蒙A")
assertEquals(listOf("H-1"), viewModel.uiState.value.visibleOrders.map { it.id })

composeRule.onNodeWithTag(HistoryRecordsTestTags.LOAD_MORE).performClick()
composeRule.onNodeWithTag(HistoryRecordsTestTags.READ_ONLY_NOTICE).assertIsDisplayed()
```

锁定只筛选历史摘要、无缓存加载、离线陈旧提示、无匹配清除筛选、可重试失败、加载更多以及卡片点击回调。测试断言中不得输出手机号、VIN 或 Token；断言不出现编辑、状态、结算类 test tag。

- [ ] **Step 2: 运行 JVM 聚焦测试并编译 Android 测试源码确认 RED。**

Run: `cd android-client; .\gradlew.bat :app:testDebugUnitTest --tests "*HistoryRecordsViewModelTest" :app:compileDebugAndroidTestKotlin`

Expected: FAIL，原因是 records ViewModel、页面及 test tag 尚不存在。

- [ ] **Step 3: 实现 ViewModel 和页面。**

```kotlin
fun loadNextPage() = viewModelScope.launch { repository.loadNextPage() }

@Composable
fun HistoryRecordsScreen(
    state: HistoryRecordsUiState,
    isOffline: Boolean,
    onQueryChange: (String) -> Unit,
    onFilterChange: (HistoryFilter) -> Unit,
    onRefresh: () -> Unit,
    onLoadMore: () -> Unit,
    onOrderSelected: (String) -> Unit,
)
```

页面使用现有品牌颜色、间距、卡片和 48dp 触控目标，显示“已结算历史档案”标题。离线不把“重新同步”做成可用写入式按钮；仅在线并存在 `nextCursor` 时显示加载更多。所有卡片只导航到详情。

- [ ] **Step 4: 运行聚焦测试确认 GREEN。**

Run: `cd android-client; .\gradlew.bat :app:testDebugUnitTest --tests "*HistoryRecordsViewModelTest" :app:compileDebugAndroidTestKotlin`

Expected: PASS；不运行 connected 测试。

- [ ] **Step 5: 检查差异并提交推送。**

Run: `git diff --check`

Commit: `feat(android): add read-only history records screen`

### Task 4: 应用装配、历史详情只读门禁与最终交付

**Files:**
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/MainActivity.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/AutoserviceApp.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/navigation/AppNavDisplay.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/ui/orders/OrderDetailScreen.kt`
- Modify: `android-client/app/src/androidTest/java/com/chengxu/autoservice/navigation/AppNavDisplayTest.kt`
- Modify: `docs/android-client.md`
- Modify: `docs/latest-handoff-prompt.md`
- Modify: `dist/releases/android/autoservice-android-debug-0.1.0.apk`

**Interfaces:**
- Consumes: `HistoryOrdersRepository`、`HistoryRecordsViewModel`、`HistoryRecordsScreen`。
- Produces: `AppRoute.Records` 的真实历史档案页；历史来源详情的强制只读展示。

- [ ] **Step 1: 写失败的导航/详情门禁测试。**

```kotlin
navigationState.select(RootTab.RECORDS)
composeRule.onNodeWithTag(HistoryRecordsTestTags.ROOT).assertIsDisplayed()
composeRule.onNodeWithTag("history-order-H-1").performClick()
composeRule.onNodeWithTag("order-detail-edit").assertDoesNotExist()
```

覆盖 records 根路由装配、历史卡片进入详情以及管理员/已开启能力下仍无写入入口。

- [ ] **Step 2: 运行 Android 测试源码编译确认 RED。**

Run: `cd android-client; .\gradlew.bat :app:compileDebugAndroidTestKotlin`

Expected: FAIL，原因是 records 装配或历史只读门禁尚未接入。

- [ ] **Step 3: 完成生产装配和详情门禁。**

在 `MainActivity` 创建历史 API/仓库；在认证会话根创建历史 ViewModel 并把状态、回调传给 `AutoserviceShell` / `AppNavDisplay`。用路由来源或显式 `readOnly` 参数使 `OrderDetailScreen` 历史进入时无条件隐藏所有写入动作，普通“工单”页的既有编辑和状态能力保持不变。

- [ ] **Step 4: 运行全量无设备门禁并归档 APK。**

Run:

```powershell
cd E:\codex\chengxu
npm.cmd test
npm.cmd run build
cd android-client
$env:JAVA_HOME='E:\codex\APP\.android-build\jdk\jdk-17.0.19+10'
$env:ANDROID_HOME='E:\codex\APP\.android-build\android-sdk'
.\gradlew.bat :app:testDebugUnitTest :app:compileDebugAndroidTestKotlin :app:lintDebug :app:assembleDebug --rerun-tasks
```

复制 `app/build/outputs/apk/debug/app-debug.apk` 到发布目录，使用 Build Tools `apksigner verify --verbose` 校验，记录字节数和 SHA-256；不启动模拟器。

- [ ] **Step 5: 更新交接、提交推送与最终核对。**

更新真机清单（历史筛选、分页、离线缓存、企业切换、详情只读）；执行 `git diff --check`，提交 `release(android): deliver history records read flow`，推送后确认 `HEAD == origin/codex/android-mobile-ui-atlas` 与工作区干净。

## Plan Self-Review

- 规格覆盖：Task 1 实现历史读取契约；Task 2 覆盖企业隔离、缓存、分页、离线和 401；Task 3 覆盖只读 UI 与交互；Task 4 覆盖装配、详情门禁、无设备验证、APK 与交接。
- 范围控制：计划不涉及客户车辆、保险档案、管理员修正、结算、返结算、作废、D1 migration、生产部署或 capability 开关。
- 类型一致性：所有 UI 仅消费 `HistoryOrdersRepository` 的 `HistoryOrdersSnapshot`；详情页通过显式只读参数而非角色推断隐藏写入入口。
