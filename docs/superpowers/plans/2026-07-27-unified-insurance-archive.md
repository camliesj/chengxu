# 保险档案跨端一致化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让网页和 Android 使用同一版本化、幂等、企业隔离的保险档案 CRUD，并在 Android 档案页提供完整单条保险管理。

**Architecture:** Cloudflare Functions 是唯一的保险业务规则层，D1 保存版本、操作幂等和审计。网页与 Android 只调用这一合同；Android 用既有 Room v2 `insurance_policies` 表保存加密缓存。

**Tech Stack:** Cloudflare Pages Functions/D1、JavaScript node:test、React、Kotlin/Compose、Room、Navigation 3。

## Global Constraints

- 不创建 Android 专用业务事实；两个客户端必须调用同一 `/api/insurance-policies` 合同。
- 所有读写依会话企业和 `insurance` 权限裁决，永不信任客户端 `companyId`。
- Android 离线只读缓存；401 清理身份数据；403 不泄露其他企业信息。
- Room 继续使用现有 v2 `insurance_policies` 表，不升级 Android schema。
- 每个检查点更新 `docs/latest-handoff-prompt.md`、提交并推送。

---

### Task 1: 版本化保险服务端合同与 D1

**Files:**
- Create: `migrations/0012_unified_insurance_policies.sql`
- Modify: `functions/api/insurance-policies.js`
- Modify: `functions/_shared/cloud-records.js`
- Test: `test/insurance-policies.test.mjs`

**Interfaces:**
- Consumes: `requireSession(request, env, { permission: 'insurance' })` 与 `writeOperationLog`。
- Produces: GET；POST `{ operationId, expectedVersion, policy }`；DELETE `/api/insurance-policies/:id` `{ operationId, expectedVersion }`。

- [ ] **Step 1: 写失败的版本与幂等测试**

```js
test('stale version does not mutate a policy', async () => {
  const result = await postPolicy({ operationId: 'op-2', expectedVersion: 1, policy: samplePolicy });
  assert.equal(result.status, 409);
  assert.equal(result.body.error, 'VERSION_CONFLICT');
});
test('same operationId returns the first result once', async () => {
  const first = await postPolicy({ operationId: 'op-1', expectedVersion: null, policy: samplePolicy });
  assert.deepEqual((await postPolicy({ operationId: 'op-1', expectedVersion: null, policy: samplePolicy })).body.policy, first.body.policy);
});
```

- [ ] **Step 2: 运行失败测试**

Run: `npm.cmd test -- --test-name-pattern="insurance"`  
Expected: FAIL，因为既有接口没有版本与操作幂等。

- [ ] **Step 3: 实现 migration 和最小合同**

```sql
ALTER TABLE insurance_policies ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
CREATE TABLE insurance_policy_operations (
  company_id TEXT NOT NULL, operation_id TEXT NOT NULL, request_hash TEXT NOT NULL,
  result_json TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (company_id, operation_id)
);
```

GET 返回 `version`、`updatedAt`；POST 只在版本相等时递增；DELETE 以企业、ID、版本原子删除。相同操作 ID 且相同哈希返回存储结果，哈希不同返回 `409 OPERATION_ID_REUSED`。保留管理员导入且不覆盖已有同企业 ID。

- [ ] **Step 4: 运行服务端测试**

Run: `npm.cmd test -- --test-name-pattern="insurance"`  
Expected: PASS，覆盖权限、隔离、冲突、幂等、删除和导入。

- [ ] **Step 5: 提交检查点**

```powershell
git add migrations/0012_unified_insurance_policies.sql functions/_shared/cloud-records.js functions/api/insurance-policies.js test/insurance-policies.test.mjs docs/latest-handoff-prompt.md
git commit -m "feat: version insurance policy api"
git push origin codex/android-mobile-ui-atlas
```

### Task 2: 网页端迁移到统一合同

**Files:**
- Modify: `src/App.jsx`
- Test: `test/app-insurance.test.mjs`

**Interfaces:**
- Consumes: Task 1 版本化 GET/POST/DELETE 响应。
- Produces: `saveCloudInsurancePolicy(policy, expectedVersion, operationId)` 与 `deleteCloudInsurancePolicy(id, expectedVersion, operationId)`。

- [ ] **Step 1: 写失败的网页请求测试**

```js
test('insurance save sends version and operation ID', async () => {
  const request = await captureSave({ ...samplePolicy, version: 3 });
  assert.equal(request.expectedVersion, 3);
  assert.match(request.operationId, /.+/);
});
```

- [ ] **Step 2: 运行失败测试**

Run: `npm.cmd test -- --test-name-pattern="insurance save"`  
Expected: FAIL，当前网页请求不带版本和操作 ID。

- [ ] **Step 3: 实现网页统一保存、删除与冲突刷新**

创建传 `expectedVersion: null`，编辑传当前版本。成功后只用服务端记录替换当前企业缓存；删除调用 DELETE。`VERSION_CONFLICT` 时重新读取企业列表，保留用户输入并提示核对后重试。

- [ ] **Step 4: 运行网页测试与构建**

Run: `npm.cmd test && npm.cmd run build`  
Expected: 全部 PASS，生产构建成功。

- [ ] **Step 5: 提交检查点**

```powershell
git add src/App.jsx test/app-insurance.test.mjs docs/latest-handoff-prompt.md
git commit -m "feat(web): use versioned insurance policies"
git push origin codex/android-mobile-ui-atlas
```

### Task 3: Android 合同、加密缓存与写入仓储

**Files:**
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/orders/InsurancePoliciesApi.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/orders/HttpUrlConnectionInsurancePoliciesApi.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/orders/InsurancePoliciesRepository.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/core/orders/cache/FoundationDao.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/core/orders/cache/EncryptedOrderStore.kt`
- Test: `android-client/app/src/test/java/com/chengxu/autoservice/core/orders/InsurancePoliciesRepositoryTest.kt`

**Interfaces:**
- Consumes: Task 1 JSON、`OrdersHttpTransport`、`SessionRepository`、`NetworkMonitor`。
- Produces: `InsurancePoliciesDataSource.snapshot`、`refresh()`、`save(draft)`、`delete(id, version)` 和 `InsurancePolicyRecord`。

- [ ] **Step 1: 写失败的 Android 冲突测试**

```kotlin
@Test fun staleWriteKeepsCacheAndExposesConflict() = runTest {
    api.next = InsurancePolicyResult.Conflict(serverPolicy)
    repository.save(draft)
    assertEquals(listOf(cached.id), cache.rows("tongda").map { it.id })
    assertTrue(repository.snapshot.value.writeState is InsuranceWriteState.Conflict)
}
```

- [ ] **Step 2: 运行失败测试**

Run: `cd android-client; .\gradlew.bat :app:testDebugUnitTest --tests com.chengxu.autoservice.core.orders.InsurancePoliciesRepositoryTest`  
Expected: FAIL，因为合同和仓储不存在。

- [ ] **Step 3: 实现 HTTP、加密缓存与仓储**

HTTP 映射 401、403、409、网络、畸形响应和取消。`EncryptedOrderStore` 加密序列化 `InsurancePolicyRecord` 并按企业原子替换；成功写入或删除更新缓存，失败不覆盖。离线写入拒绝且不触网。

- [ ] **Step 4: 运行 Android 仓储测试**

Run: `cd android-client; .\gradlew.bat :app:testDebugUnitTest --tests com.chengxu.autoservice.core.orders.InsurancePoliciesRepositoryTest`  
Expected: PASS，覆盖缓存、隔离、离线、401、403、409、幂等重试。

- [ ] **Step 5: 提交检查点**

```powershell
git add android-client/app/src/main/java/com/chengxu/autoservice/core/orders android-client/app/src/main/java/com/chengxu/autoservice/core/orders/cache android-client/app/src/test/java/com/chengxu/autoservice/core/orders/InsurancePoliciesRepositoryTest.kt docs/latest-handoff-prompt.md
git commit -m "feat(android): add insurance policy repository"
git push origin codex/android-mobile-ui-atlas
```

### Task 4: Android 保险界面与最终验证

**Files:**
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/ui/records/InsurancePoliciesViewModel.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/ui/records/InsurancePoliciesScreen.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/AutoserviceApp.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/MainActivity.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/navigation/AppNavDisplay.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/navigation/AppRoute.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/ui/shell/AutoserviceShell.kt`
- Test: `android-client/app/src/test/java/com/chengxu/autoservice/ui/records/InsurancePoliciesViewModelTest.kt`

**Interfaces:**
- Consumes: Task 3 `InsurancePoliciesDataSource` 与 `InsuranceWriteState`。
- Produces: 第三个档案标签、保险详情/表单路由、读写与冲突状态。

- [ ] **Step 1: 写失败的离线提交门禁测试**

```kotlin
@Test fun offlineCreateIsDisabled() = runTest {
    val viewModel = InsurancePoliciesViewModel(source, MutableStateFlow(ConnectionState.Offline))
    viewModel.openCreate()
    assertTrue(viewModel.uiState.value.submitDisabled)
}
```

- [ ] **Step 2: 运行失败测试**

Run: `cd android-client; .\gradlew.bat :app:testDebugUnitTest --tests com.chengxu.autoservice.ui.records.InsurancePoliciesViewModelTest`  
Expected: FAIL，因为第三标签和 ViewModel 不存在。

- [ ] **Step 3: 实现界面与路由**

在 `RecordsTabs` 加“保险档案”，每页独立状态。列表显示到期状态和日期；详情显示全字段；有 `MANAGE_INSURANCE` 且在线时显示新建/编辑/删除，删除二次确认并带当前版本；冲突重新读取，不自动覆盖。

- [ ] **Step 4: 全量验证与 APK**

```powershell
npm.cmd test
npm.cmd run build
cd android-client
$env:JAVA_HOME='E:\codex\APP\.android-build\jdk\jdk-17.0.19+10'
$env:ANDROID_HOME='E:\codex\APP\.android-build\android-sdk'
.\gradlew.bat :app:testDebugUnitTest :app:compileDebugAndroidTestKotlin :app:lintDebug :app:assembleDebug
```

Expected: 所有命令退出码为 0。复制 APK 到 `dist/releases/android/autoservice-android-debug-0.1.0.apk`，以 `apksigner verify --verbose` 校验 v2 签名并记录 SHA-256。

- [ ] **Step 5: 提交最终检查点**

```powershell
git add android-client docs/latest-handoff-prompt.md dist/releases/android/autoservice-android-debug-0.1.0.apk
git commit -m "feat(android): manage insurance policy archives"
git push origin codex/android-mobile-ui-atlas
```

## Self-Review

- Spec coverage：Task 1 是 D1/服务端，Task 2 是网页迁移，Task 3 是 Android 安全数据层，Task 4 是 Android UI 与最终发布。
- Placeholder scan：无 TBD、TODO 或未定义的后续步骤。
- Type consistency：创建使用 `expectedVersion: null`；编辑与删除使用当前整数 `version`；所有客户端都使用 `operationId`。
