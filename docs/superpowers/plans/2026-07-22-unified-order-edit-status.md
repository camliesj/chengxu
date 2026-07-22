# Unified Web and Android Order Edit and Status Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为网页端和 Android 交付同一套未结算工单编辑与普通状态流转能力，具备企业能力开关、乐观并发、幂等回执、冲突比较、未知结果恢复和双端一致缓存。

**Architecture:** Cloudflare Pages Functions 与 D1 是唯一写入事实源；编辑和状态分别使用专用命令端点，并共享 operation 租约、版本锁和审计批次。网页端使用 React 四步编辑向导与 IndexedDB/Web Crypto 草稿，Android 使用完整详情仓库、Room v2 加密草稿、独立 ViewModel 和 Navigation 3 路由；两端由同一 JSON contract fixture 约束。

**Tech Stack:** Cloudflare Pages Functions、D1、Node `node:test`、React 19、Vite 6、Playwright 1.61、IndexedDB/Web Crypto、Kotlin 2.3.21、Java 17、Compose、Navigation 3、Room 2.8.4、Android Keystore AES-GCM、Gradle wrapper 8.13。

## Global Constraints

- 分支固定为 `codex/android-mobile-ui-atlas`；每个任务开始前执行 `git pull --ff-only` 并确认工作树没有非本任务改动。
- 正式设计固定为 `docs/superpowers/specs/2026-07-22-unified-order-edit-status-design.md`。
- 编辑请求是 16 个客户端可写字段的完整快照；服务端忽略 ID、企业、角色、状态、版本、日期时间、结算、回执和作废字段。
- 编辑只允许未结算、未作废工单；员工只能相邻向前，管理员可在三个普通状态间相邻前进或回退。
- 普通状态端点永远不能产生 `已结算`；结算、返结算、作废、历史修正和回执不属于本计划。
- 每个写命令必须携带 UUID `operationId` 和正整数 `expectedVersion`，成功后版本精确加一。
- 版本或状态冲突不静默覆盖、不自动重放；请求结果未知时只查询原 operation ID。
- 所有正式业务写入必须在线；离线只允许编辑和加密保存编辑草稿，不建立写队列，不自动提交状态。
- 手机号、VIN、草稿和状态待确认信封的明文不得进入 localStorage、Room 明文列、操作摘要或普通日志。
- `EDIT_ORDER` 与 `ADVANCE_ORDER_STATUS` 独立启停，客户端按钮不是授权边界，服务端必须再次校验。
- 不新增 D1 migration，不升级 Room schema；创建草稿、编辑草稿和状态信封必须通过 local ID namespace 隔离。
- 每个任务严格 RED -> GREEN -> 回归；重要改动必须更新 `docs/latest-handoff-prompt.md`、提交 Git 并推送 GitHub。
- 不启动 Android 模拟器；保留 JVM 单元测试、Android 测试源码编译、Lint、APK 构建和真机验收清单。
- 执行 Wrangler、D1 或 Pages 命令前必须加载 `cloudflare:wrangler` 技能并复核当前官方命令。

## File and Interface Map

服务端：

- `contracts/order-edit-v1.json`：16 字段、校验、合法/非法输入与冲突差异的唯一 fixture。
- `contracts/order-status-v1.json`：角色相邻状态矩阵与合法/非法目标的唯一 fixture。
- `functions/_shared/order-command-operation.js`：编辑和状态使用的 operation 认领、租约、重放与结果查询。
- `functions/_shared/order-edit.js`：完整快照 normalize、差异和编辑命令。
- `functions/_shared/order-status.js`：普通状态校验和状态命令。
- `functions/api/orders/[id]/index.js`：保留 GET 并增加 PATCH。
- `functions/api/orders/[id]/status.js`：普通状态 POST。
- `functions/api/order-operations/edit-order/[operationId].js` 与 `change-order-status/[operationId].js`：未知结果查询。

网页端：

- `src/orderEditLogic.js`、`orderEditApi.js`、`orderEditDraftStore.js`：纯状态、transport 和加密草稿。
- `src/components/OrderEditWizard.jsx`：复用创建表单结构的四步编辑体验与冲突比较。
- `src/orderStatusApi.js`、`components/OrderStatusConfirmDialog.jsx`：状态 transport、确认和恢复。
- `src/App.jsx`：能力 envelope、缓存更新、入口与现有 legacy 行为接线。

Android：

- `core/orders/OrderEditApi.kt`、`HttpUrlConnectionOrderEditApi.kt`、`OrderEditRepository.kt`：编辑 API、完整详情与仓库。
- `ui/edit/*`：编辑 ViewModel、共享四步组件适配、冲突页。
- `core/orders/OrderStatusApi.kt`、`HttpUrlConnectionOrderStatusApi.kt`、`OrderStatusRepository.kt`：状态 API 与待确认信封。
- `ui/status/*`：全屏确认和结果恢复。
- `navigation/AppRoute.kt`、`AppNavDisplay.kt`、`AutoserviceApp.kt`、`MainActivity.kt`：会话级生产装配。

---

### Task 1: Canonical Edit and Status Contracts

**Files:**
- Create: `contracts/order-edit-v1.json`
- Create: `contracts/order-status-v1.json`
- Create: `test/orderEditContract.test.mjs`
- Modify: `test/orderStatusPermissions.test.mjs`
- Modify: `shared/orderStatusPermissions.js`
- Modify: `docs/latest-handoff-prompt.md`

**Interfaces:**
- Consumes: stage 2 metadata shape from `contracts/order-creation-v1.json`.
- Produces: `ORDINARY_ORDER_STATUSES`, `allowedStatusTargets(role, from)` and two version-1 fixtures used by Node, web and Android tests. `ORDER_EDIT_FIELDS` is exported from Task 2's server module and contract-checked against the edit fixture.

- [ ] **Step 1: Write contract RED tests**

Add exact assertions:

```js
assert.deepEqual(contract.fields, [
  'customer', 'phone', 'plate', 'car', 'vin', 'staff',
  'insuranceExpiry', 'insurer', 'type', 'accidentType', 'claimNo',
  'record', 'laborCents', 'materialCents', 'delivery', 'remark',
]);
assert.deepEqual(statusContract.transitions.staff, [
  { from: '在修中', to: '已完工' },
  { from: '已完工', to: '待结算' },
]);
assert.equal(statusContract.targets.includes('已结算'), false);
```

Run:

```powershell
node --test test/orderEditContract.test.mjs test/orderStatusPermissions.test.mjs
```

Expected: RED because the two fixture files and exported canonical helpers do not exist.

- [ ] **Step 2: Add exact version-1 fixtures and shared JavaScript helpers**

`shared/orderStatusPermissions.js` must export:

```js
export const ORDINARY_ORDER_STATUSES = ['在修中', '已完工', '待结算'];
export function allowedStatusTargets(role, from) {
  return ORDINARY_ORDER_STATUSES.filter((to) => canTransitionOrderStatus(role, from, to));
}
```

The edit fixture must contain at least two valid full snapshots, field-error cases for every validator family, forbidden system fields, and one conflict case with exact `conflictingFields`. The status fixture must enumerate every allowed edge and explicit forbidden jump/backward/settled cases.

- [ ] **Step 3: Run GREEN and full Node regression**

```powershell
node --test test/orderEditContract.test.mjs test/orderStatusPermissions.test.mjs
npm.cmd test
```

Expected: focused tests and the complete Node suite pass with zero failures.

- [ ] **Step 4: Update handoff, commit, and push**

Record fixture versions, exact field list, test totals, no migration, and no production changes. Commit:

```powershell
git add contracts shared test docs/latest-handoff-prompt.md
git commit -m "test(orders): lock edit and status contracts"
git push origin codex/android-mobile-ui-atlas
```

---

### Task 2: Shared Operation Lease and Server Edit Command

**Files:**
- Create: `functions/_shared/order-command-operation.js`
- Create: `functions/_shared/order-edit.js`
- Create: `test/orderEditLogic.test.mjs`
- Create: `test/orderEditApi.test.mjs`
- Modify: `functions/_shared/order-creation.js`
- Modify: `functions/_shared/order-foundation.js`
- Modify: `functions/_shared/order-audit.js`
- Modify: `functions/api/orders/[id]/index.js`
- Create: `functions/api/order-operations/edit-order/[operationId].js`
- Modify: `docs/latest-handoff-prompt.md`

**Interfaces:**
- Consumes: `buildOrderCreationMetadata(dictionaryRows)`, D1 `order_operations`, `repair_orders.version`, `operation_logs.event_id`.
- Produces: `normalizeEditOrderCommand(input, metadata)`, `diffEditableFields(existing, submitted)`, `handleEditOrderCommand({ env, session, orderId, payload })`, `readEditOrderOperation({ env, session, operationId })`.

- [ ] **Step 1: Write pure edit RED tests**

Tests must assert trim/default/length/date/enum/integer-cent behavior and protected fields:

```js
const normalized = normalizeEditOrderCommand(fixture.input, metadata);
assert.deepEqual(normalized.fieldErrors, {});
assert.equal(normalized.value.amountCents, 42000);
assert.equal(Object.hasOwn(normalized.value, 'status'), false);
assert.deepEqual(diffEditableFields(serverOrder, fixture.input), fixture.conflictingFields);
```

Run:

```powershell
node --test test/orderEditLogic.test.mjs
```

Expected: RED because `functions/_shared/order-edit.js` is absent.

- [ ] **Step 2: Extract reusable operation lease functions without changing create behavior**

The new module must expose these exact contracts and return shapes:

```text
claimOperation(env, key, requestHash, targetId)
  -> Promise<{ kind: 'claimed', operation, leaseToken } | { kind: 'response', response }>
replayCompletedOperation(operation)
  -> Response
storeTerminalOperationResult(env, key, leaseToken, httpStatus, body)
  -> Promise<{ stored: boolean }>
readOperationResult(env, key)
  -> Promise<Response>
```

Move the stage 2 UUID/hash/lease/replay mechanics into this module and make `order-creation.js` consume them. Replace the older `order-foundation.js` operation helpers with compatibility re-exports or migrate their tests/callers in the same commit; do not leave a third lease implementation. Keep create action `create_order`, stored response HTTP status, target reservation, 30-second lease and existing tests unchanged. Terminal 409 results reached after a lease claim are stored as completed command results with their original HTTP status so an operation query can replay them deterministically.

- [ ] **Step 3: Write endpoint RED tests with a fake transactional D1 batch**

Cover unauthenticated, cross-company 404, capability off, staff without repair, settled, voided, validation, success, version conflict, same-hash replay, hash reuse, active/expired lease and query isolation. The successful fake batch must assert this order:

```js
assert.deepEqual(batchKinds, ['audit-sentinel', 'order-update', 'operation-complete']);
assert.equal(updatedOrder.version, expectedVersion + 1);
assert.equal(auditRows.filter((row) => row.event_id === operationId).length, 1);
```

Run:

```powershell
node --test test/orderEditApi.test.mjs
```

Expected: RED because PATCH and edit operation query are absent.

- [ ] **Step 4: Implement canonical edit and atomic success batch**

`PATCH /api/orders/:id` accepts only:

```js
const command = {
  operationId: cleanText(payload.operationId),
  expectedVersion: Number(payload.expectedVersion),
  order: normalized.value,
};
```

The update must include `company_id`, `id`, `version`, `voided = 0`, and ordinary status predicates. Audit insert uses `INSERT OR IGNORE ... SELECT ... WHERE` with the same preconditions. Operation completion is conditional on the unique audit sentinel. Verify all three batch `changes`; if the precondition misses, read the latest safe detail, store a stable 409 result, and never write a success audit.

- [ ] **Step 5: Implement route and result query**

`functions/api/orders/[id]/index.js` keeps `onRequestGet` and adds:

```js
export async function onRequestPatch(context) {
  const { session, error } = await requireSession(context.request, context.env);
  if (error) return error;
  return handleEditOrderCommand({
    env: context.env,
    session,
    orderId: context.params.id,
    payload: await context.request.json(),
  });
}
```

The query route passes action `edit_order` and the authenticated actor/company to `readEditOrderOperation`.

- [ ] **Step 6: GREEN, create regression, build, handoff, commit, and push**

```powershell
node --test test/orderEditLogic.test.mjs test/orderEditApi.test.mjs test/orderCreationApi.test.mjs
npm.cmd test
npm.cmd run build
git add functions test docs/latest-handoff-prompt.md
git commit -m "feat(orders): add idempotent edit command"
git push origin codex/android-mobile-ui-atlas
```

Expected: focused and full Node suites pass; Vite production build succeeds; no remote D1 or Pages action occurs.

---

### Task 3: Legacy Edit Compatibility and Capability Envelope

**Files:**
- Modify: `functions/api/orders.js`
- Modify: `test/orderEditApi.test.mjs`
- Modify: `test/ordersReadApi.test.mjs`
- Modify: `src/App.jsx`
- Modify: `docs/latest-handoff-prompt.md`

**Interfaces:**
- Consumes: `handleEditOrderCommand` and `readCapabilities`.
- Produces: legacy GET envelope `{ orders, capabilities, serverTime }`; legacy ordinary edit adapter with `eventId -> operationId` and `order.version -> expectedVersion`.

- [ ] **Step 1: Write compatibility RED tests**

Assert that existing ordinary orders no longer execute the old UPSERT path:

```js
assert.equal(result.status, 200);
assert.equal(editServiceCalls.length, 1);
assert.deepEqual(editServiceCalls[0], {
  orderId: existing.id,
  operationId: payload.eventId,
  expectedVersion: payload.order.version,
});
assert.equal(legacyUpsertCalls, 0);
```

Also assert legacy GET retains `orders` and adds company/role-filtered capabilities without exposing account secrets.

- [ ] **Step 2: Route only ordinary legacy edits through the shared command**

For an existing, un-settled order and empty mode, build the same 16-field input using one exported adapter and call `handleEditOrderCommand`. Missing/invalid `eventId` or `version` must return 400. Keep `archive_edit`, settlement, reverse settlement and receipt maintenance on their existing legacy branches because they are outside stage 3.

- [ ] **Step 3: Preserve web read compatibility while exposing capabilities**

Change `fetchCloudOrders` to return an envelope, not a bare array:

```js
return {
  orders: Array.isArray(data.orders) ? data.orders : [],
  capabilities: Array.isArray(data.capabilities) ? data.capabilities : [],
  serverTime: String(data.serverTime || ''),
};
```

Update both initial load and manual refresh call sites to write orders and capabilities separately. No write button may infer company capability from role alone.

- [ ] **Step 4: Verify legacy reads/edits and commit**

```powershell
node --test test/orderEditApi.test.mjs test/ordersReadApi.test.mjs test/orderCreationApi.test.mjs
npm.cmd test
npm.cmd run build
git add functions src test docs/latest-handoff-prompt.md
git commit -m "refactor(orders): unify legacy ordinary edits"
git push origin codex/android-mobile-ui-atlas
```

---

### Task 4: Web Edit State, Transport, and Encrypted Per-Order Drafts

**Files:**
- Create: `src/orderEditLogic.js`
- Create: `src/orderEditApi.js`
- Create: `src/orderEditDraftStore.js`
- Create: `test/orderEditWebLogic.test.mjs`
- Create: `test/orderEditDraftStore.test.mjs`
- Modify: `src/orderCreationDraftStore.js`
- Modify: `test/orderCreationDraftStore.test.mjs`
- Modify: `docs/latest-handoff-prompt.md`

**Interfaces:**
- Consumes: creation metadata shape, `apiFetch`, Web Crypto, IndexedDB.
- Produces: `createInitialOrderEditState(detail, metadata)`, `orderEditReducer`, `buildEditOrderPayload`, `editOrderCommand`, `queryEditOperation`, `EncryptedOrderEditDraftStore`.

- [ ] **Step 1: Write reducer and payload RED tests**

Use the canonical fixture and assert full snapshot, version and conflict state:

```js
const built = buildEditOrderPayload(state, operationId);
assert.deepEqual(Object.keys(built.payload.order).sort(), contract.fields.toSorted());
assert.equal(built.payload.expectedVersion, detail.version);
const conflicted = orderEditReducer(state, {
  type: 'conflict', latest, conflictingFields: ['record', 'laborCents'],
});
assert.equal(conflicted.submitState, 'conflict');
```

Run `node --test test/orderEditWebLogic.test.mjs`; expect RED for missing module.

- [ ] **Step 2: Implement pure edit state and stable API result mapping**

Use action states `idle`, `submitting`, `confirming`, `conflict`. `editOrderCommand` calls PATCH; `queryEditOperation` calls the edit operation route. Map 400 field errors, 401, 403, 404, 409 conflict/pending/reused, network, 5xx and malformed JSON to explicit `kind` values. An AbortError propagates unchanged.

- [ ] **Step 3: Write encrypted draft RED tests**

Test keys and lifecycle exactly:

```js
await store.save('user-a', 'tongda', 'RO1', draftOne);
await store.save('user-a', 'tongda', 'RO2', draftTwo);
assert.deepEqual(await store.load('user-a', 'tongda', 'RO1'), draftOne);
assert.equal(JSON.stringify(storage.records).includes('13800000000'), false);
await store.deleteForActorCompany('user-a', 'tongda');
assert.equal(await store.load('user-a', 'tongda', 'RO2'), null);
```

- [ ] **Step 4: Implement actor/company/order encryption isolation**

Use additional authenticated data `edit:${actor}:${companyId}:${orderId}`, a non-exportable AES-GCM key, 12-byte random IV and record version 1. Persist the metadata snapshot inside the ciphertext so an existing edit draft remains usable offline. Corrupt/unknown records are deleted. Creation store tests must still prove the create key remains actor+company and edit deletion cannot remove create drafts.

- [ ] **Step 5: GREEN, regression, handoff, commit, and push**

```powershell
node --test test/orderEditWebLogic.test.mjs test/orderEditDraftStore.test.mjs test/orderCreationDraftStore.test.mjs
npm.cmd test
git add src test docs/latest-handoff-prompt.md
git commit -m "feat(web): add edit state and encrypted drafts"
git push origin codex/android-mobile-ui-atlas
```

---

### Task 5: Web Four-Step Edit UI and Conflict Resolution

**Files:**
- Create: `src/components/OrderEditWizard.jsx`
- Create: `e2e/order-edit.spec.mjs`
- Modify: `src/components/OrderCreationWizard.jsx`
- Modify: `src/App.jsx`
- Modify: `src/styles.css`
- Modify: `docs/latest-handoff-prompt.md`

**Interfaces:**
- Consumes: Task 4 reducer/API/draft store and App-level `{ orders, capabilities }`.
- Produces: online/offline edit entry, four-step wizard, leave confirmation, result confirmation and explicit conflict rebase.

- [ ] **Step 1: Write Playwright RED scenarios**

Add deterministic route mocks for:

```text
EDIT_ORDER absent -> no enabled edit entry
offline -> wizard opens from existing draft, save works, submit disabled
200 -> server version replaces list/detail and draft is deleted
409 -> server/local differences render; no automatic PATCH follows
rebase -> expectedVersion becomes latest only after explicit button
5xx then operation completed -> same operationId is queried and applied
```

Run `npm.cmd run test:web-ui -- e2e/order-edit.spec.mjs`; expect RED because the wizard and routes are not connected.

- [ ] **Step 2: Extract shared four-step field sections**

Move only presentation primitives from creation into focused components while keeping create behavior unchanged. Both wizards must use the same ordered sections:

```js
export const ORDER_FORM_STEPS = [
  '客户与车辆', '保险与事故', '维修与费用', '确认提交',
];
```

Do not share create/edit reducer state or operation IDs.

- [ ] **Step 3: Implement edit wizard lifecycle**

Open with latest server detail or prompt to continue the matching encrypted draft. Autosave dirty fields after 500 ms, flush on explicit save and page exit, and require a three-way leave choice. Submit is enabled only when online, `EDIT_ORDER` is present, state is idle, and current status is ordinary.

- [ ] **Step 4: Implement conflict comparison and rebase**

Render every `conflictingFields` item with base/server/local values. Buttons have exact effects:

```js
onReturnToDetail(); // deletes the conflicting draft and displays latest
onRebase();         // keeps local fields, replaces baseSnapshot and expectedVersion, no request
```

After rebase, the next user submit generates a new UUID. The conflict operation ID is never reused.

- [ ] **Step 5: Replace ordinary legacy edit UI path**

All un-settled edit entries in tables, side detail and detail dialog open `OrderEditWizard`. Keep admin `archive_edit` UI unchanged. Remove status selection from the ordinary edit form so status only changes through the dedicated command in later tasks.

- [ ] **Step 6: GREEN, regression, build, handoff, commit, and push**

```powershell
npm.cmd run test:web-ui -- e2e/order-edit.spec.mjs
npm.cmd test
npm.cmd run test:web-ui
npm.cmd run build
git add src e2e test docs/latest-handoff-prompt.md
git commit -m "feat(web): add conflict-safe order editing"
git push origin codex/android-mobile-ui-atlas
```

Expected: new edit scenarios, existing creation Playwright tests, Node suite and Vite build all pass.

---

### Task 6: Android Edit Contract, Full Detail Envelope, and HTTP API

**Files:**
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/orders/model/OrderEditModels.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/orders/OrderEditApi.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/orders/HttpUrlConnectionOrderEditApi.kt`
- Create: `android-client/app/src/test/java/com/chengxu/autoservice/core/orders/model/OrderEditContractTest.kt`
- Create: `android-client/app/src/test/java/com/chengxu/autoservice/core/orders/HttpUrlConnectionOrderEditApiTest.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/core/orders/model/OrderCommandResult.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/core/orders/model/OrderModels.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/core/orders/OrderReadApi.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/core/orders/HttpUrlConnectionOrderReadApi.kt`
- Modify: `android-client/app/src/test/java/com/chengxu/autoservice/core/orders/HttpUrlConnectionOrderReadApiTest.kt`
- Modify: `docs/latest-handoff-prompt.md`

**Interfaces:**
- Consumes: root `contracts/order-edit-v1.json`, existing strict `OrderDetail` parser and `OrderCreationMetadata`.
- Produces: `OrderDetailEnvelope`, `OrderEditCommand`, `OrderEditApi.edit`, `OrderEditApi.queryOperation`, conflict fields on `OrderCommandResult.Conflict`.

- [ ] **Step 1: Write fixture-driven Android RED test**

The test source set already exposes root `contracts/`. Assert exact JSON:

```kotlin
val command = form.toEditCommand(operationId, expectedVersion)
val json = (command as OrderCommandResult.Success).value.toJsonObject()
assertEquals(expectedVersion, json["expectedVersion"]?.jsonPrimitive?.long)
assertEquals(contractFields, json["order"]?.jsonObject?.keys)
assertNull(json["order"]?.jsonObject?.get("status"))
```

Run:

```powershell
cd android-client
.\gradlew.bat :app:testDebugUnitTest --tests "*OrderEditContractTest"
```

Expected: RED because edit models do not exist.

- [ ] **Step 2: Add exact edit models and full detail envelope**

Use these signatures:

```kotlin
data class OrderDetailEnvelope(
    val order: OrderDetail,
    val capabilities: Set<BusinessCapability>,
    val serverTime: String,
)
data class OrderEditCommand(
    val operationId: String,
    val expectedVersion: Long,
    val order: OrderCreateInput,
)
data class ConflictFields(
    val names: Set<String> = emptySet(),
)
```

Extend the sealed result with `NotFound` and `OperationIdReused`, and change conflict to `Conflict(latest: OrderDetail?, conflictingFields: Set<String> = emptySet())`. Update every exhaustive `when` in creation/read/edit production and tests during this task; creation behavior remains unchanged.

Change `OrderReadApi.fetchDetail` to return `OrderReadResult<OrderDetailEnvelope>` and preserve strict company/version parsing. Update all focused tests and any fake implementations in the same step.

- [ ] **Step 3: Write HTTP RED tests**

Assert PATCH body, encoded order ID, query path, Bearer header, 200 detail, 400 fields, 401, 403, 404, 409 latest/conflictingFields/pending, 5xx, IOException, malformed JSON and cancellation propagation.

- [ ] **Step 4: Implement edit transport**

Use the exact interface:

```kotlin
interface OrderEditApi {
    suspend fun edit(token: String, orderId: String, command: OrderEditCommand): OrderCommandResult<OrderDetail>
    suspend fun queryOperation(token: String, operationId: String): OrderCommandResult<OrderDetail>
}
```

Both order ID and operation ID are encoded as one UTF-8 path segment. A request-emitted IOException, 5xx, malformed response, or `OPERATION_IN_PROGRESS` returns `UnknownResult(operationId)`; preflight input errors return validation failure without a request.

- [ ] **Step 5: GREEN, Android test-source compile, handoff, commit, and push**

```powershell
.\gradlew.bat :app:testDebugUnitTest --tests "*OrderEditContractTest" --tests "*HttpUrlConnectionOrderEditApiTest" --tests "*HttpUrlConnectionOrderReadApiTest"
.\gradlew.bat :app:compileDebugAndroidTestKotlin
git add app/src/main app/src/test ../docs/latest-handoff-prompt.md
git commit -m "feat(android): add order edit contract and api"
git push origin codex/android-mobile-ui-atlas
```

Run Git commands from `android-client` only with the shown `../docs` path, or return to repository root and stage equivalent paths.

---

### Task 7: Android Full Detail and Encrypted Edit Repository

**Files:**
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/orders/OrderDetailRepository.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/orders/OrderEditRepository.kt`
- Create: `android-client/app/src/test/java/com/chengxu/autoservice/core/orders/OrderDetailRepositoryTest.kt`
- Create: `android-client/app/src/test/java/com/chengxu/autoservice/core/orders/OrderEditRepositoryTest.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/core/orders/cache/FoundationDao.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/core/orders/cache/EncryptedOrderStore.kt`
- Modify: `android-client/app/src/androidTest/java/com/chengxu/autoservice/core/orders/cache/FoundationDaoTest.kt`
- Modify: `android-client/app/src/test/java/com/chengxu/autoservice/core/orders/OrderCreationRepositoryTest.kt`
- Modify: `docs/latest-handoff-prompt.md`

**Interfaces:**
- Consumes: `OrderReadApi`, `OrderCreateApi.fetchMetadata`, `OrderEditApi`, `EncryptedOrderStore`, `OrderCreationSummaryStore`, session/network/invalidator.
- Produces: `OrderDetailRepository.load(orderId)`, `OrderEditRepository.loadEditor`, draft observe/save/delete, `edit`, and `confirm`.

- [ ] **Step 1: Write DAO and local-store RED tests**

Add Android test-source assertions for separate local IDs:

```kotlin
dao.replaceEditDraft(editDraft("RO1"))
dao.upsertDraft(statusEnvelope("RO1"))
dao.replaceEditDraft(editDraft("RO1", record = "new"))
assertEquals("new", dao.getEditDraft("tongda", "RO1")?.let(::decryptRecord))
assertNotNull(dao.getDraft("tongda", "status:RO1"))
assertNotNull(dao.getLatestCreateDraft("tongda"))
```

Add JVM fakes that prove corrupted edit ciphertext deletes only `edit:RO1`, cancellation propagates, and create drafts remain untouched. Run `:app:compileDebugAndroidTestKotlin`; expect compile RED for missing DAO methods.

- [ ] **Step 2: Add exact DAO/store methods without Room migration**

Use deterministic namespaces and queries:

```kotlin
private fun editDraftId(orderId: String) = "edit:$orderId"
private fun statusEnvelopeId(orderId: String) = "status:$orderId"
```

`replaceEditDraft` deletes only `companyId + localId = edit:<orderId>` before insert. Add direct `getDraft(companyId, localId)`, `observeDraft(companyId, localId)` and `deleteDraft(companyId, localId)` paths. Do not query/delete by `baseOrderId` alone because that would also match the status envelope.

- [ ] **Step 3: Write detail/edit repository RED tests**

Cover cache-first offline detail, online strict refresh, company mismatch rejection, capability caching bound to session identity, edit success persistence order, UnknownResult draft retention, confirm success cleanup, 401 invalidation and conflict preservation:

```kotlin
assertEquals(listOf("detail", "summary", "delete-edit-draft"), localWrites)
assertIs<OrderCommandResult.UnknownResult>(repository.edit(command))
assertNotNull(localStore.getEditDraft(companyId, orderId))
assertEquals(emptyList<String>(), networkCallsWhenOffline)
```

- [ ] **Step 4: Implement repository gates and persistence**

Required interfaces:

```kotlin
interface OrderDetailRepository {
    suspend fun load(orderId: String): OrderReadResult<OrderDetailEnvelope>
}
interface OrderEditRepository {
    suspend fun loadEditor(orderId: String): OrderCommandResult<OrderEditorData>
    fun observeDraft(orderId: String): Flow<OrderDraft?>
    suspend fun saveDraft(orderId: String, draft: OrderDraft)
    suspend fun deleteDraft(orderId: String)
    suspend fun edit(orderId: String, command: OrderEditCommand): OrderCommandResult<OrderDetail>
    suspend fun confirm(operationId: String): OrderCommandResult<OrderDetail>
}
```

`loadEditor` combines latest full detail with canonical metadata and server capabilities. The encrypted edit draft includes the last successfully loaded metadata required to render the existing form offline. Offline load may use cached detail plus draft; edit refuses before HTTP unless online, identity matches and `EDIT_ORDER` is present. A success must match session company, then write detail, summary, and delete only the matching edit draft. A 404 deletes the inaccessible cached detail/summary and returns `NotFound`.

- [ ] **Step 5: GREEN and compile Android tests**

```powershell
.\gradlew.bat :app:testDebugUnitTest --tests "*OrderDetailRepositoryTest" --tests "*OrderEditRepositoryTest" --tests "*OrderCreationRepositoryTest"
.\gradlew.bat :app:compileDebugAndroidTestKotlin
```

Expected: JVM tests pass and Room/Compose Android test sources compile; no emulator runs.

- [ ] **Step 6: Update handoff, commit, and push**

```powershell
git add app/src/main app/src/test app/src/androidTest ../docs/latest-handoff-prompt.md
git commit -m "feat(android): add encrypted edit repository"
git push origin codex/android-mobile-ui-atlas
```

---

### Task 8: Android Four-Step Edit UI, Conflict Screen, and Navigation

**Files:**
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/ui/edit/EditOrderModels.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/ui/edit/EditOrderViewModel.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/ui/edit/EditOrderScreen.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/ui/orders/OrderDetailViewModel.kt`
- Create: `android-client/app/src/test/java/com/chengxu/autoservice/ui/edit/EditOrderViewModelTest.kt`
- Create: `android-client/app/src/test/java/com/chengxu/autoservice/ui/orders/OrderDetailViewModelTest.kt`
- Create: `android-client/app/src/androidTest/java/com/chengxu/autoservice/EditOrderScreenTest.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/ui/create/CreateOrderComponents.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/ui/orders/OrderDetailScreen.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/navigation/AppRoute.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/navigation/AppNavDisplay.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/AutoserviceApp.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/MainActivity.kt`
- Modify: `android-client/app/src/test/java/com/chengxu/autoservice/navigation/AppNavigationStateTest.kt`
- Modify: `android-client/app/src/androidTest/java/com/chengxu/autoservice/OrderDetailScreenTest.kt`
- Modify: `docs/latest-handoff-prompt.md`

**Interfaces:**
- Consumes: Task 7 repositories and existing creation field primitives.
- Produces: `OrderDetailViewModel.open(orderId)`, `AppRoute.EditOrder(orderId)`, detail edit entry, four-step editor, conflict comparison and `EditOrderEvent.Saved/Exit`.

- [ ] **Step 1: Write ViewModel RED tests**

Cover initial detail+draft resolution, four-step validation, 500 ms autosave, background flush, offline edit/online submit, capability disabled, submit lock, field errors, UnknownResult restore, conflict and explicit rebase:

```kotlin
viewModel.open("RO1")
viewModel.submit()
assertEquals("confirming", viewModel.uiState.value.submitState)
viewModel.rebaseOnLatest()
assertEquals(latest.summary.version, viewModel.uiState.value.expectedVersion)
assertEquals(localRecord, viewModel.uiState.value.form.record)
assertEquals(0, repository.editCallsAfterRebase)
```

`OrderDetailViewModelTest` must also prove online detail replaces cache, offline cached detail remains visible, 404 closes an unavailable detail, and 401 invokes the shared session invalidator. Run `:app:testDebugUnitTest --tests "*EditOrderViewModelTest" --tests "*OrderDetailViewModelTest"`; expect RED for missing detail/edit UI types.

- [ ] **Step 2: Implement edit state and ViewModel**

Use these stable states:

```kotlin
enum class EditSubmitState { IDLE, SUBMITTING, CONFIRMING, CONFLICT }
sealed interface EditOrderEvent {
    data class Saved(val orderId: String) : EditOrderEvent
    data object Exit : EditOrderEvent
}
```

Rebase replaces base detail and expected version but keeps all local form fields. Return-to-detail deletes the conflict draft and emits Exit. Only a later explicit submit creates a new UUID.

- [ ] **Step 3: Write Compose contract RED tests**

Test source must locate 48dp actions and tags for `edit_order`, `save_edit_draft`, `submit_edit`, `confirm_edit_result`, `return_to_detail`, and `rebase_edit`. Assert offline submit disabled, conflict rows render server/local values, and settled detail has no edit action. Compile must fail before production composables exist.

- [ ] **Step 4: Implement UI and routes**

Add:

```kotlin
@Serializable data class EditOrder(val orderId: String) : AppRoute
```

`OrderDetailViewModel.open(orderId)` loads through `OrderDetailRepository` and owns the latest full detail/capabilities/error state for the active route. `OrderDetailScreen` receives that state, offline flag, `onEdit`, and later status targets. It displays “只读” only when no mutation is available. `EditOrderScreen` reuses focused form field composables but owns independent state and fixed bottom actions. Navigation returns to the same `OrderDetail(orderId)` after save/exit and refreshes that detail from the repository.

- [ ] **Step 5: Wire one session-scoped ViewModel and lifecycle flush**

`MainActivity` constructs `HttpUrlConnectionOrderReadApi`, `DefaultOrderDetailRepository`, `HttpUrlConnectionOrderEditApi` and `DefaultOrderEditRepository`. `AutoserviceApp` creates `OrderDetailViewModel` and `EditOrderViewModel` under `SessionViewModelStoreOwner`, invokes the matching `open(orderId)` when detail/edit routes change, flushes edit state on `ON_STOP`, and collects Saved/Exit events without creating duplicate ViewModels.

- [ ] **Step 6: GREEN, Android gates, handoff, commit, and push**

```powershell
.\gradlew.bat :app:testDebugUnitTest --tests "*EditOrderViewModelTest" --tests "*OrderDetailViewModelTest" --tests "*AppNavigationStateTest"
.\gradlew.bat :app:compileDebugAndroidTestKotlin :app:lintDebug
git add app/src/main app/src/test app/src/androidTest ../docs/latest-handoff-prompt.md
git commit -m "feat(android): add conflict-safe order editing"
git push origin codex/android-mobile-ui-atlas
```

Expected: JVM and compilation gates pass, Lint has zero Fatal/Error, and no emulator starts.

---

### Task 9: Server Ordinary Status Command and Operation Query

**Files:**
- Create: `functions/_shared/order-status.js`
- Create: `functions/api/orders/[id]/status.js`
- Create: `functions/api/order-operations/change-order-status/[operationId].js`
- Create: `test/orderStatusApi.test.mjs`
- Modify: `functions/_shared/order-command-operation.js`
- Modify: `functions/_shared/order-audit.js`
- Modify: `test/orderStatusPermissions.test.mjs`
- Modify: `docs/latest-handoff-prompt.md`

**Interfaces:**
- Consumes: `canTransitionOrderStatus`, Task 2 operation lease/batch pattern, `ADVANCE_ORDER_STATUS`.
- Produces: `normalizeStatusCommand`, `handleStatusCommand({ env, session, orderId, payload })`, `readStatusOperation`.

- [ ] **Step 1: Write role/state/API RED tests**

Drive all fixture edges and assert:

```js
assert.equal(await transition('staff', '在修中', '已完工'), 200);
assert.equal(await transition('staff', '已完工', '在修中'), 403);
assert.equal(await transition('admin', '待结算', '已完工'), 200);
assert.equal(await transition('admin', '在修中', '待结算'), 409);
assert.equal(await transition('admin', '待结算', '已结算'), 400);
```

Also cover auth, cross-company/voided 404, capability off, invalid UUID/version/target, version conflict latest detail, idempotent replay, hash reuse, active/expired lease, actor query isolation and one audit event.

- [ ] **Step 2: Implement pure status normalization**

`POST /api/orders/:id/status` accepts a canonical body containing only:

```js
{
  operationId: cleanText(payload.operationId),
  expectedVersion: positiveInteger(payload.expectedVersion),
  targetStatus: cleanText(payload.targetStatus),
}
```

Reject `已结算` as `TARGET_STATUS_INVALID`. A role-disallowed adjacent direction returns 403 `STATUS_TRANSITION_FORBIDDEN`; a valid ordinary target that is no longer adjacent to current state returns 409 `ORDER_STATUS_CONFLICT` with latest detail.

- [ ] **Step 3: Implement atomic status batch and routes**

Use action `change_order_status`. The D1 batch inserts a unique audit sentinel only if version/state/lease match, updates `status`, `version + 1`, `updated_at`, and completes operation only if the sentinel exists. A successful response contains the full latest detail and capabilities. The query route returns the stored response without writing another audit.

- [ ] **Step 4: GREEN, full server regression, build, handoff, commit, and push**

```powershell
node --test test/orderStatusApi.test.mjs test/orderStatusPermissions.test.mjs test/orderEditApi.test.mjs
npm.cmd test
npm.cmd run build
git add functions shared test docs/latest-handoff-prompt.md
git commit -m "feat(orders): add ordinary status command"
git push origin codex/android-mobile-ui-atlas
```

---

### Task 10: Web Status Confirmation, Conflict, and Unknown Result Recovery

**Files:**
- Create: `src/orderStatusApi.js`
- Create: `src/components/OrderStatusConfirmDialog.jsx`
- Create: `test/orderStatusWebApi.test.mjs`
- Create: `e2e/order-status.spec.mjs`
- Modify: `src/App.jsx`
- Modify: `src/styles.css`
- Modify: `docs/latest-handoff-prompt.md`

**Interfaces:**
- Consumes: status API and App-level capabilities/orders.
- Produces: `changeOrderStatusCommand`, `queryStatusOperation`, role-based adjacent action list and modal lifecycle.

- [ ] **Step 1: Write transport RED tests**

Assert exact request and result mapping:

```js
assert.deepEqual(JSON.parse(request.body), {
  operationId,
  expectedVersion: 4,
  targetStatus: '待结算',
});
assert.equal(request.method, 'POST');
assert.equal(request.url, '/api/orders/RO1/status');
```

Map completed, pending, version/status conflict, unauthorized, forbidden, not found, server failure, network and malformed results without parsing Chinese text.

- [ ] **Step 2: Write Playwright RED scenarios**

Cover staff forward-only, admin adjacent backward, no action at staff pending settlement, modal contents, double-click single request, success list/detail update, 409 latest status, and 5xx followed by same-ID operation completion.

- [ ] **Step 3: Implement modal and replace ordinary legacy status calls**

The dialog shows ID, plate, current, target and impact. Confirm is disabled while submitting. `updateOrderStatus` must call the new status API and never call `upsertOrder` for ordinary transitions. Settlement/reverse settlement keep their existing dedicated legacy paths until their later stages.

- [ ] **Step 4: Implement unknown result recovery**

Keep the original operation ID in React state for the active confirmation. Query before allowing another status request. On completed, replace the order from server; on conflict, close the stale confirmation and show latest status; on pending, retain the confirmation state.

- [ ] **Step 5: GREEN, complete web gates, handoff, commit, and push**

```powershell
node --test test/orderStatusWebApi.test.mjs
npm.cmd run test:web-ui -- e2e/order-status.spec.mjs
npm.cmd test
npm.cmd run test:web-ui
npm.cmd run build
git add src test e2e docs/latest-handoff-prompt.md
git commit -m "feat(web): add ordinary status workflow"
git push origin codex/android-mobile-ui-atlas
```

---

### Task 11: Android Status API, Encrypted Pending Envelope, and Full-Screen Confirmation

**Files:**
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/orders/model/OrderStatusModels.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/orders/OrderStatusApi.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/orders/HttpUrlConnectionOrderStatusApi.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/orders/OrderStatusRepository.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/ui/status/OrderStatusModels.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/ui/status/OrderStatusViewModel.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/ui/status/OrderStatusConfirmScreen.kt`
- Create: `android-client/app/src/test/java/com/chengxu/autoservice/core/orders/HttpUrlConnectionOrderStatusApiTest.kt`
- Create: `android-client/app/src/test/java/com/chengxu/autoservice/core/orders/OrderStatusRepositoryTest.kt`
- Create: `android-client/app/src/test/java/com/chengxu/autoservice/ui/status/OrderStatusViewModelTest.kt`
- Create: `android-client/app/src/androidTest/java/com/chengxu/autoservice/OrderStatusConfirmScreenTest.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/core/orders/cache/EncryptedOrderStore.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/navigation/AppRoute.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/navigation/AppNavDisplay.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/ui/orders/OrderDetailScreen.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/AutoserviceApp.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/MainActivity.kt`
- Modify: `android-client/app/src/test/java/com/chengxu/autoservice/core/orders/model/OrderStateMachineTest.kt`
- Modify: `docs/latest-handoff-prompt.md`

**Interfaces:**
- Consumes: `OrderStatusTransition`, full detail repository, existing `order_drafts`, summary/detail stores.
- Produces: `OrderStatusCommand`, `PendingStatusRecovery`, `OrderStatusRepository.change/confirm/restorePending`, `AppRoute.ChangeOrderStatus`, full-screen UI.

- [ ] **Step 1: Write fixture/API RED tests**

Read `contracts/order-status-v1.json` and verify Kotlin `allowedOrderTransition` matches every allowed/forbidden edge. HTTP tests assert POST/query paths, Bearer, JSON, strict detail and all result mappings.

- [ ] **Step 2: Add status command and pending envelope models**

Use exact models:

```kotlin
data class OrderStatusCommand(
    val operationId: String,
    val expectedVersion: Long,
    val targetStatus: OrderStatus,
)
data class PendingStatusEnvelope(
    val orderId: String,
    val operationId: String,
    val expectedVersion: Long,
    val targetStatus: String,
    val createdAtMillis: Long,
)
data class PendingStatusRecovery(
    val envelope: PendingStatusEnvelope,
    val result: OrderCommandResult<OrderDetail>,
)
```

The serialized envelope is encrypted and stored as local ID `status:<orderId>`. It is created only after a request has been emitted and returned UnknownResult, never for an offline preflight attempt.

- [ ] **Step 3: Write repository/ViewModel RED tests**

Cover offline no-write/no-envelope, role/capability matrix, submit lock, success persistence, UnknownResult envelope, app restore query-first, completed cleanup, conflict cleanup/latest detail and no auto-replay:

```kotlin
assertIs<OrderCommandResult.NetworkUnavailable>(repository.change(command))
assertNull(localStore.getPendingStatus(orderId))
assertEquals(originalOperationId, repository.restorePending(orderId).queriedOperationId)
assertEquals(1, api.changeCalls)
```

- [ ] **Step 4: Implement repository and full-screen state**

Use the exact repository boundary:

```kotlin
interface OrderStatusRepository {
    suspend fun change(orderId: String, command: OrderStatusCommand): OrderCommandResult<OrderDetail>
    suspend fun confirm(operationId: String): OrderCommandResult<OrderDetail>
    suspend fun restorePending(orderId: String): PendingStatusRecovery?
}
```

`change` requires online/current identity/`ADVANCE_ORDER_STATUS`; success persists detail+summary and deletes the status envelope. UnknownResult persists the encrypted envelope. `restorePending` always queries before exposing another confirmation action and returns the original envelope alongside the mapped result.

- [ ] **Step 5: Implement route, detail actions, and Compose test tags**

Add serializable route carrying `orderId` and `targetStatus`. The screen renders order ID, plate, current, target, impact, cancel and confirm. The detail page derives buttons from role plus server capability; employee pending settlement has none. All touch actions are at least 48dp and include disabled/loading/focus semantics.

- [ ] **Step 6: Production wiring and lifecycle recovery**

Construct one `HttpUrlConnectionOrderStatusApi` and repository in `MainActivity`; create one session-scoped ViewModel in `AutoserviceApp`. On authenticated startup and detail entry, inspect the matching encrypted status envelope and query its original operation. Do not generate a replacement UUID during restore.

- [ ] **Step 7: GREEN, Android gates, handoff, commit, and push**

```powershell
.\gradlew.bat :app:testDebugUnitTest --tests "*HttpUrlConnectionOrderStatusApiTest" --tests "*OrderStatusRepositoryTest" --tests "*OrderStatusViewModelTest" --tests "*OrderStateMachineTest"
.\gradlew.bat :app:compileDebugAndroidTestKotlin :app:lintDebug
git add app/src/main app/src/test app/src/androidTest ../docs/latest-handoff-prompt.md
git commit -m "feat(android): add ordinary status workflow"
git push origin codex/android-mobile-ui-atlas
```

---

### Task 12: Cross-Client Contract Gate and Clean Release Candidate Build

**Files:**
- Create: `test/orderMutationContractGate.test.mjs`
- Modify: `test/orderEditContract.test.mjs`
- Modify: `test/orderStatusPermissions.test.mjs`
- Modify: `docs/android-client.md`
- Modify: `docs/latest-handoff-prompt.md`

**Interfaces:**
- Consumes: all stage 3 server/web/Android source and fixtures.
- Produces: source-level drift guard, complete no-device verification evidence and release-candidate APK.

- [ ] **Step 1: Add source drift RED checks**

Scan production source and assert:

```js
assert.doesNotMatch(webSource, /upsertOrder\(\{ \.\.\.currentOrder, status/u);
assert.doesNotMatch(androidEditSource, /"喷漆维修（无换件）"/u);
assert.match(serverLegacySource, /handleEditOrderCommand/u);
assert.match(androidDraftSource, /edit:\$orderId/u);
assert.match(androidDraftSource, /status:\$orderId/u);
```

The gate must also compare Node and Android-known field/status names against both root fixtures.

- [ ] **Step 2: Run focused mutation gate and fix only discovered drift**

```powershell
node --test test/orderMutationContractGate.test.mjs test/orderEditContract.test.mjs test/orderStatusPermissions.test.mjs
```

Expected: initial RED identifies any remaining legacy ordinary edit/status path or duplicated catalog; after focused corrections, all pass.

- [ ] **Step 3: Run complete web clean gates**

```powershell
npm.cmd test
npm.cmd run test:web-ui
npm.cmd run build
```

Expected: every Node and Playwright test passes and Vite production build succeeds. Record exact totals.

- [ ] **Step 4: Run complete Android clean no-device gates**

```powershell
cd android-client
.\gradlew.bat clean :app:testDebugUnitTest :app:compileDebugAndroidTestKotlin :app:lintDebug :app:assembleDebug --rerun-tasks
```

Expected: `BUILD SUCCESSFUL`, all JVM tests pass, Android test Kotlin compiles, Lint has zero Fatal/Error, and Debug APK is produced. Do not run `connectedDebugAndroidTest` and do not start an emulator.

- [ ] **Step 5: Update the real-phone checklist**

`docs/android-client.md` must cover both companies, employee/admin matrices, every edit entry, four steps, offline encrypted draft, conflict/rebase, status confirmation, double tap, unknown result restart, cross-device web synchronization, logout/company cleanup and 360dp/IME behavior.

- [ ] **Step 6: Update handoff, commit, and push**

```powershell
git add test docs android-client
git commit -m "test(orders): gate unified edit and status flows"
git push origin codex/android-mobile-ui-atlas
```

Do not copy the APK into the final release directory in this task; production deployment and final artifact happen in Task 13.

---

### Task 13: Production Deployment, Independent Capability Enablement, and Final APK

**Files:**
- Modify: `docs/android-client.md`
- Modify: `docs/latest-handoff-prompt.md`
- Replace: `dist/releases/android/autoservice-android-debug-0.1.0.apk`

**Interfaces:**
- Consumes: Task 12 green release candidate and current Cloudflare production project `chengxu` / D1 `chengxu-db`.
- Produces: deployed production web/API, independently enabled edit/status capabilities, verified APK and rollback evidence.

- [ ] **Step 1: Load Wrangler skill and verify target identity/readiness**

Run read-only checks for Wrangler version/login, Pages project, D1 database, current migrations and current capability rows. Confirm there is no pending migration and that only `VIEW_ORDERS + CREATE_ORDER` are enabled before this release.

- [ ] **Step 2: Export the remote D1 backup before enabling writes**

```powershell
npx.cmd wrangler d1 export chengxu-db --remote --output tmp/d1-backups/pre-android-stage-3.sql
Get-Item tmp/d1-backups/pre-android-stage-3.sql | Select-Object FullName,Length
Get-FileHash tmp/d1-backups/pre-android-stage-3.sql -Algorithm SHA256
```

Expected: non-empty SQL export. Record absolute path, byte count and hash in the handoff; keep it ignored and do not commit it.

- [ ] **Step 3: Capture production pre-deploy safety counts**

Read only: total orders, per-company orders, operation count, audit count, enabled capability rows and temporary smoke-session count. Store values in the execution notes so post-deploy checks can prove no automated business mutation occurred.

- [ ] **Step 4: Rebuild and deploy Pages production**

```powershell
npm.cmd run build
npx.cmd wrangler pages deploy dist --project-name chengxu --branch main
```

Record the deployment URL. Verify production domain unauthenticated GET/PATCH/status/query return 401 as appropriate. Do not treat a deployment preview 404 as proof of Functions failure; the production domain is authoritative.

- [ ] **Step 5: Run authenticated capability-off smoke without business writes**

Create short-lived, random in-memory smoke sessions through parameterized D1 commands, scoped to each target company and `repair` permission, then always delete them in a finally path. With both new capabilities off, assert read works while valid-shape edit/status requests against a non-existent sentinel ID return capability-disabled or target-not-found according to the server's fixed authorization order. Never target an existing production order.

- [ ] **Step 6: Enable `EDIT_ORDER` independently and verify**

For `tongda` and `xinqiheng`, upsert only `EDIT_ORDER=1`. Re-read exact capability sets and verify edit capability is present while `ADVANCE_ORDER_STATUS` remains absent. Repeat only non-existent-target/invalid-input smoke and confirm business/order/operation/audit counts are unchanged.

Rollback command for this checkpoint is an upsert of `EDIT_ORDER=0` for the same two companies; record it in the handoff without executing it after a successful gate.

- [ ] **Step 7: Enable `ADVANCE_ORDER_STATUS` independently and verify**

Upsert only `ADVANCE_ORDER_STATUS=1` for both companies. Assert final sets are exactly `VIEW_ORDERS + CREATE_ORDER + EDIT_ORDER + ADVANCE_ORDER_STATUS`, with no settlement, reverse, void, receipt, record-management or export capabilities newly enabled. Repeat non-destructive smoke and post-count comparison.

Rollback command for this checkpoint changes only `ADVANCE_ORDER_STATUS` to 0.

- [ ] **Step 8: Build, archive, hash, and verify the final APK**

```powershell
cd android-client
.\gradlew.bat :app:assembleDebug
Copy-Item app/build/outputs/apk/debug/app-debug.apk ../dist/releases/android/autoservice-android-debug-0.1.0.apk -Force
Get-Item ../dist/releases/android/autoservice-android-debug-0.1.0.apk | Select-Object FullName,Length
Get-FileHash ../dist/releases/android/autoservice-android-debug-0.1.0.apk -Algorithm SHA256
```

Compare source and release hashes, then run Build Tools 35.0.0 `apksigner verify --verbose` and require `Verified using v2 scheme: true`. This is an API 26+ Debug-signed installable APK for user real-phone validation.

- [ ] **Step 9: Final documentation, verification, commit, and push**

Record deployment URL, production domain checks, D1 backup, pre/post counts, capability sets, complete test totals, APK path/size/hash/signature, no-emulator status, rollback commands and real-phone residual checks.

```powershell
git add dist/releases/android/autoservice-android-debug-0.1.0.apk docs/android-client.md docs/latest-handoff-prompt.md
git diff --cached --check
git commit -m "release(android): deliver unified edit and status apk"
git push origin codex/android-mobile-ui-atlas
```

After push, require `HEAD == origin/codex/android-mobile-ui-atlas` and a clean worktree. Production business edit/status success is not claimed until the user completes the real-phone and web manual checklist.

## Execution Checkpoints

- Batch A ends after Task 3: shared edit contract/service and legacy compatibility are complete; both production capabilities remain off.
- Batch B ends after Task 8: web and Android edit experiences are complete; production `EDIT_ORDER` remains off.
- Batch C ends after Task 11: ordinary status service and both clients are complete; production `ADVANCE_ORDER_STATUS` remains off.
- Batch D contains Tasks 12-13: clean cross-client gates, deployment, independent capability enablement and final APK.

At every checkpoint, stop if focused RED did not fail for the intended missing behavior, any GREEN command has failures, unrelated user changes overlap the task, D1 counts change unexpectedly, or the target company/capability set differs from the recorded precondition.
