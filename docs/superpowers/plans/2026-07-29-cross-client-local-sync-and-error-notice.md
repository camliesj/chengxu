# 跨端本机同步时间与可关闭错误提示实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 三端显示按企业隔离的本机最近成功同步时间；Android 有全量同步入口；网页/Windows 短期错误可关闭并自动消失。

**Architecture:** 网页与 Windows 共享 React 本地同步协调器。Android 用现有 Android Keystore 加密值存储和会话级协调器。只复用既有认证仓储/API，不改 D1、Room、权限或业务数据。

**Tech Stack:** React/Vite/Tauri、localStorage、Kotlin/Compose、Coroutines/StateFlow、Android Keystore、SharedPreferences。

## Global Constraints

- 同步时间是本机当前企业的四类数据全部成功刷新时间，不写云端。
- 刷新覆盖工单、车辆、保险、历史；任一失败保留缓存和旧时间。
- 仅网络/保存/刷新/下载短期错误自动消失；字段校验和静态业务告警保留。
- 不启动模拟器；客户端可见更新必须递增版本、构建/核验/上传真实 APK。

---

### Task 1: 网页/Windows 全量同步协调器

**Files:**
- Create: `src/companySyncLogic.js`
- Create: `test/companySyncLogic.test.mjs`
- Modify: `src/App.jsx`
- Modify: `test/appSourceContract.test.mjs`

**Interfaces:** `readCompanySyncAt(storage, companyId)`, `writeCompanySyncAt(storage, companyId, at)` 和 `runCompanyFullSync({ now, refreshOrders, refreshVehicles, refreshPolicies, refreshHistory })`；后者仅在四个 Promise 都成功时返回 `{ ok: true, at }`，否则返回 `{ ok: false, error }`。

- [ ] **Step 1: 写 RED Node 测试**

```js
test('does not replace a previous time when one source fails', async () => {
  const result = await runCompanyFullSync({
    now: () => '2026-07-29T09:00:00.000Z', refreshOrders: async () => {},
    refreshVehicles: async () => {}, refreshPolicies: async () => { throw new Error('offline'); },
    refreshHistory: async () => {},
  });
  assert.deepEqual(result, { ok: false, error: 'offline' });
});
```

- [ ] **Step 2: 验证 RED** — 运行 `node --test test/companySyncLogic.test.mjs`；预期因模块不存在失败。

- [ ] **Step 3: 最小实现** — 使用 `zhiwei:company-sync:<companyId>` 键，拒绝格式非法时间；`Promise.all` 成功后才由 `now()` 返回并持久化时间，异常不写时间。

- [ ] **Step 4: 接入 `App.jsx`** — 替换会话级 `lastRefreshAt` 为按企业读取的持久化值；工作台刷新调用四源同步；局部列表刷新保留分页/筛选语义；按钮同步中禁用。

- [ ] **Step 5: 验证并提交** — 运行 `node --test test/companySyncLogic.test.mjs test/appSourceContract.test.mjs`，预期 PASS 并覆盖企业隔离、四源成功、失败保留与时间展示；随后执行 `git add src/companySyncLogic.js src/App.jsx test/companySyncLogic.test.mjs test/appSourceContract.test.mjs` 和 `git commit -m "feat(sync): persist per-company refresh state"`。

### Task 2: 网页/Windows 可关闭短期错误提示

**Files:**
- Create: `src/transientErrorLogic.js`
- Create: `test/transientErrorLogic.test.mjs`
- Modify: `src/App.jsx`
- Modify: `src/styles.css`
- Modify: `test/appSourceContract.test.mjs`

**Interfaces:** `createTransientError(message, now)` 返回 `{ message, createdAt }`；`isTransientErrorVisible(notice, now, durationMs = 8000)`；`DismissibleErrorBanner({ message, onDismiss })` 仅接收短期状态错误。

- [ ] **Step 1: 写 RED 计时测试**

```js
test('a transient error expires after eight seconds', () => {
  const notice = createTransientError('云端刷新失败', 1000);
  assert.equal(isTransientErrorVisible(notice, 8999), true);
  assert.equal(isTransientErrorVisible(notice, 9000), false);
});
```

- [ ] **Step 2: 验证 RED** — 运行 `node --test test/transientErrorLogic.test.mjs`；预期因模块不存在失败。

- [ ] **Step 3: 实现并迁移** — 保留 `cloud-banner error` 视觉，加入标签“关闭错误提示”的关闭按钮和 8 秒 effect；迁移 orders、records、回执、导出、设置请求错误；成功、关闭和卸载清理状态；作废说明、能力说明和字段校验不迁移。

- [ ] **Step 4: 验证并提交** — 运行 `node --test test/transientErrorLogic.test.mjs test/appSourceContract.test.mjs`，预期 PASS；执行 `git add src/transientErrorLogic.js src/App.jsx src/styles.css test/transientErrorLogic.test.mjs test/appSourceContract.test.mjs` 后执行 `git commit -m "fix(ui): dismiss transient cloud errors"`。

### Task 3: Android 同步协调器与安全时间存储

**Files:**
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/sync/CompanySyncStore.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/sync/CompanySyncCoordinator.kt`
- Create: `android-client/app/src/test/java/com/chengxu/autoservice/core/sync/CompanySyncCoordinatorTest.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/MainActivity.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/AutoserviceApp.kt`

**Interfaces:** `CompanySyncStore.read(companyId): Long?`、`write(companyId, epochMillis)`；`CompanySyncState(lastSuccessfulAtMillis, syncing, message)`；`CompanySyncCoordinator.refreshAll()` 并行调用四个既有数据源。

- [ ] **Step 1: 写 RED JVM 测试**

```kotlin
@Test fun failure_keeps_previous_sync_time() = runTest {
    val coordinator = coordinator(previous = 1000L, policiesFailure = true)
    coordinator.refreshAll()
    assertEquals(1000L, coordinator.state.value.lastSuccessfulAtMillis)
    assertFalse(coordinator.state.value.syncing)
}
```

- [ ] **Step 2: 验证 RED** — 运行 `./gradlew.bat :app:testDebugUnitTest --tests '*CompanySyncCoordinatorTest'`；预期新 sync 包缺失而失败。

- [ ] **Step 3: 实现** — 遵循 `SharedPreferencesEncryptedValueStore`/Keystore 模式，只加密保存企业 epoch；用 `Mutex` 禁止重复刷新；四个 `refresh()` 均正常返回后写当前时间；异常只设用户可读消息，绝不清除缓存。

- [ ] **Step 4: 会话装配** — 在 `MainActivity` 建 store，在 `AuthenticatedRoot` 建会话生命周期 coordinator；未认证不联网，企业切换读取对应时间。

- [ ] **Step 5: 验证并提交** — 运行 `./gradlew.bat :app:testDebugUnitTest --tests '*CompanySyncCoordinatorTest' :app:compileDebugAndroidTestKotlin`，预期 BUILD SUCCESSFUL；随后添加 sync 包、`MainActivity.kt`、`AutoserviceApp.kt` 和测试并提交 `feat(android): coordinate full company sync`。

### Task 4: Android“我的”页同步刷新 UI

**Files:**
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/ui/profile/ProfileScreen.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/ui/shell/AutoserviceShell.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/navigation/AppNavDisplay.kt`
- Create: `android-client/app/src/androidTest/java/com/chengxu/autoservice/ProfileScreenTest.kt`

**Interfaces:** `ProfileScreen` 接收 `CompanySyncState` 和 `onRefreshData`；`AutoserviceShell` 仅向个人页转发。

- [ ] **Step 1: 写 RED Compose 测试**

```kotlin
composeRule.onNodeWithText("同步刷新").assertIsDisplayed().performClick()
assertEquals(1, refreshCalls)
composeRule.onNodeWithText("最近同步：今天 14:32").assertIsDisplayed()
```

- [ ] **Step 2: 验证 RED** — 运行 `./gradlew.bat :app:compileDebugAndroidTestKotlin`；预期状态、回调和文案缺失。

- [ ] **Step 3: 实现与连线** — 固定“刚刚同步”改为格式化时间；卡片中加入 `Refresh` 图标和“同步刷新”按钮，同步中显示“同步中”并禁用；失败走 Material Snackbar 的“关闭”动作；从 `AutoserviceApp` 经 shell/nav 传入 coordinator 状态；离线和旧时间仍可见。

- [ ] **Step 4: 验证并提交** — 运行 `./gradlew.bat :app:testDebugUnitTest :app:compileDebugAndroidTestKotlin`，预期 BUILD SUCCESSFUL；添加以上 UI 文件与测试，提交 `feat(android): add profile sync refresh`。

### Task 5: 全量验证、APK 发布与交接

**Files:**
- Modify: `android-client/app/build.gradle.kts`
- Modify: `docs/latest-handoff-prompt.md`
- Update: `public/downloads/zhiwei-car-service_<next>.apk`
- Update: `dist/releases/android/autoservice-android-debug-<next>.apk`

- [ ] **Step 1: 网页/Windows 门禁** — 运行 `npm.cmd test`、`npm.cmd run build`、`npm.cmd run desktop:check`；预期均通过，Windows 自动继承 React 行为。

- [ ] **Step 2: Android 无设备门禁** — 递增 Android versionCode/versionName，运行 `:app:testDebugUnitTest :app:compileDebugAndroidTestKotlin :app:lintDebug :app:assembleDebug`；预期 BUILD SUCCESSFUL。

- [ ] **Step 3: 归档、签名、发布** — 复制 APK 至两个版本化发布路径，运行 `apksigner verify --verbose` 与 `aapt dump badging`，受控上传 APK、更新元数据、核验生产下载 URL 与 SHA-256。

- [ ] **Step 4: 交接** — 更新 `docs/latest-handoff-prompt.md`（功能、文件、未变 schema、APK 版本/哈希/地址、验证），提交并推送 `codex/android-mobile-ui-atlas`。

## Plan Self-Review

- Tasks 1/3 覆盖企业隔离、持久化时间和四源全成功规则；Task 2 覆盖网页/Windows 错误生命周期；Task 4 覆盖 Android UI；Task 5 覆盖真实安装包与交接。
- 没有 D1、Room、API、权限或生产业务数据修改。
