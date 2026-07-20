# Android Stage 1 Production Data Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立 Android 完整业务能力所需的领域模型、权限与状态机、D1 版本/幂等基础、兼容读取 API、字段加密和 Room v2 存储，同时保持现有只读工单功能可用。

**Architecture:** 继续复用现有 Cloudflare Functions、D1、认证会话和 Android `CachedOrdersRepository`，不建设第二套后端。阶段 1 只建立可被后续新增、编辑、结算和档案阶段复用的基础边界；生产 UI 仍保持只读，所有新写入命令端点留到后续阶段。

**Tech Stack:** Kotlin 2.3.21、Java 17、Compose BOM 2026.06.00、Room 2.8.4、KSP 2.3.9、kotlinx.serialization 1.11.0、Android Keystore AES-GCM、Cloudflare Pages Functions、D1、Node `node:test`、Gradle 8.x。

## Global Constraints

- 分支固定为 `codex/android-mobile-ui-atlas`；实施前先确认工作区干净并执行 `git pull`。
- 所有 Gradle 命令从 `E:\codex\chengxu\android-client` 执行；所有 Node、Wrangler、Git 和文件哈希命令从 `E:\codex\chengxu` 执行。
- Android `minSdk = 26`、`targetSdk = 35`、`compileSdk = 36`，不得降低版本或增加未经规格批准的依赖。
- 所有企业和角色必须从 Bearer 会话解析；客户端提交的 `companyId`、角色或能力值不能作为授权依据。
- 阶段 1 不实现新增、编辑、状态写入、结算、返结算、作废、回执维护、导出或后台 WorkManager。
- 旧网页和 Windows 客户端未携带新查询参数时，`GET /api/orders` 必须保持既有结构和筛选语义。
- Android 现有只读工单页面、工作台指标、登录、退出和公司隔离行为必须保持兼容。
- 离线只读；本阶段只持久化加密草稿基础，不建立离线写队列、不自动提交。
- 手机号、VIN 和草稿载荷进入 Room 前使用 Android Keystore 支持的 AES-GCM 加密；密码、回执二进制、COS 对象键和短期 URL 不进入 Room。
- 每个任务严格执行 RED -> GREEN -> 回归；每次重要改动更新 `docs/latest-handoff-prompt.md`、提交 Git 并推送 GitHub。
- 不启动 Android 模拟器；保留 JVM 测试、Android 测试代码编译、Lint 和 APK 构建。连接式 Room/Keystore 测试只编译，不声称已执行。
- 主设计规格：`docs/superpowers/specs/2026-07-20-android-complete-business-capability-design.md`。
- 仓库当前 Wrangler 为 `4.107.0`。D1 migration/export 与 Pages deploy 命令以 Cloudflare 官方文档为准：`https://developers.cloudflare.com/d1/reference/migrations/`、`https://developers.cloudflare.com/d1/best-practices/import-export-data/`、`https://developers.cloudflare.com/workers/wrangler/commands/pages/`。

## File Responsibility Map

- `android-client/.../core/orders/model/OrderModels.kt`：完整业务领域值对象，不包含网络或 Room 类型。
- `android-client/.../core/orders/model/OrderStateMachine.kt`：员工/管理员普通状态迁移纯函数。
- `android-client/.../core/orders/model/OrderCommandResult.kt`：后续写命令共享的稳定结果类型。
- `android-client/.../core/model/AppPermission.kt` 与 `PermissionSnapshot.kt`：客户端授权能力映射。
- `migrations/0010_android_order_foundation.sql`：D1 版本、幂等操作和公司能力开关。
- `functions/_shared/order-foundation.js`：服务端状态、能力、游标和幂等基础函数。
- `functions/api/orders.js`：保留旧读取；增加带 `scope` 的分页/增量读取。
- `functions/api/orders/[id]/index.js`：公司隔离的完整工单详情读取。
- `android-client/.../core/orders/OrderReadApi.kt`：分页、详情和能力读取接口。
- `android-client/.../core/orders/HttpUrlConnectionOrderReadApi.kt`：扩展读取传输和容错映射。
- `android-client/.../core/security/StringCipher.kt`：可复用 AES-GCM 字符串加密核心。
- `android-client/.../core/orders/cache/*Entity.kt`：Room v2 的摘要、详情、草稿、游标和档案基础表。
- `android-client/.../core/orders/cache/FoundationDao.kt`：新基础表的公司隔离访问。
- `RoomOrderCache.kt`：把现有只读仓库适配到 v2 摘要表，不承担新业务规则。

---

### Task 1: Android 完整领域、状态机与权限契约

**Files:**
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/orders/model/OrderModels.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/orders/model/OrderStateMachine.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/orders/model/OrderCommandResult.kt`
- Create: `android-client/app/src/test/java/com/chengxu/autoservice/core/orders/model/OrderStateMachineTest.kt`
- Create: `android-client/app/src/test/java/com/chengxu/autoservice/core/orders/model/OrderModelsTest.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/core/model/AppPermission.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/core/session/PermissionSnapshot.kt`
- Modify: `android-client/app/src/test/java/com/chengxu/autoservice/core/session/PermissionSnapshotTest.kt`
- Modify: `docs/latest-handoff-prompt.md`

**Interfaces:**
- Consumes: `UserRole`,现有服务端状态原文和金额“分”规则。
- Produces: `OrderSummary`、`OrderDetail`、`OrderDraft`、`SettlementDraft`、`OrderStatus`、`OrderStatusTransition`、`OrderCommandResult`、`BusinessCapability`、`allowedOrderTransition(role, from, to)`。

- [ ] **Step 1: 写状态机与权限 RED 测试**

```kotlin
class OrderStateMachineTest {
    @Test fun employeeMovesForwardOneStepOnly() {
        assertTrue(allowedOrderTransition(UserRole.EMPLOYEE, OrderStatus.IN_REPAIR, OrderStatus.COMPLETED))
        assertTrue(allowedOrderTransition(UserRole.EMPLOYEE, OrderStatus.COMPLETED, OrderStatus.PENDING_SETTLEMENT))
        assertFalse(allowedOrderTransition(UserRole.EMPLOYEE, OrderStatus.IN_REPAIR, OrderStatus.PENDING_SETTLEMENT))
        assertFalse(allowedOrderTransition(UserRole.EMPLOYEE, OrderStatus.COMPLETED, OrderStatus.IN_REPAIR))
        assertFalse(allowedOrderTransition(UserRole.EMPLOYEE, OrderStatus.PENDING_SETTLEMENT, OrderStatus.SETTLED))
    }

    @Test fun administratorMovesOneStepInEitherDirectionInsideOrdinaryStates() {
        assertTrue(allowedOrderTransition(UserRole.ADMINISTRATOR, OrderStatus.COMPLETED, OrderStatus.IN_REPAIR))
        assertTrue(allowedOrderTransition(UserRole.ADMINISTRATOR, OrderStatus.PENDING_SETTLEMENT, OrderStatus.COMPLETED))
        assertFalse(allowedOrderTransition(UserRole.ADMINISTRATOR, OrderStatus.IN_REPAIR, OrderStatus.PENDING_SETTLEMENT))
        assertFalse(allowedOrderTransition(UserRole.ADMINISTRATOR, OrderStatus.SETTLED, OrderStatus.PENDING_SETTLEMENT))
    }
}
```

在 `PermissionSnapshotTest` 增加员工允许 `VIEW_RECORDS`、禁止 `MANAGE_RECORDS`/`EXPORT_DATA`，管理员允许所有枚举的断言。

- [ ] **Step 2: 运行 RED 并确认缺少新类型**

Run:

```powershell
$env:JAVA_HOME='E:\codex\APP\.android-build\jdk\jdk-17.0.19+10'
$env:ANDROID_HOME='E:\codex\APP\.android-build\android-sdk'
E:\codex\APP\.android-build\gradle\gradle-8.10.2\bin\gradle.bat :app:testDebugUnitTest --tests "*OrderStateMachineTest" --tests "*PermissionSnapshotTest"
```

在 `android-client` 目录执行。Expected: Kotlin 编译失败，明确缺少 `OrderStatus`、`allowedOrderTransition`、`VIEW_RECORDS` 等新契约。

- [ ] **Step 3: 添加完整领域模型**

`OrderModels.kt` 定义以下完整公开签名：

```kotlin
enum class OrderStatus(val wireValue: String) {
    IN_REPAIR("在修中"), COMPLETED("已完工"),
    PENDING_SETTLEMENT("待结算"), SETTLED("已结算");

    companion object {
        fun fromWire(value: String): OrderStatus? = entries.firstOrNull { it.wireValue == value.trim() }
    }
}

enum class OrderScope { CURRENT, HISTORY }

data class ReceiptMetadata(
    val name: String = "", val contentType: String = "",
    val sizeBytes: Long = 0, val uploadedAt: String = "",
)

data class OrderSummary(
    val id: String, val companyId: String, val version: Long,
    val date: String, val dateSortKey: String, val time: String,
    val plate: String, val customer: String, val car: String,
    val type: String, val status: String, val amountCents: Long,
    val record: String, val insuranceExpiry: String, val delivery: String,
    val updatedAt: String,
)

data class OrderDetail(
    val summary: OrderSummary,
    val phone: String, val insurer: String, val staff: String, val vin: String,
    val claimNo: String, val accidentType: String, val paymentMethod: String,
    val remark: String, val laborCents: Long, val materialCents: Long,
    val settlementDate: String, val settlementTime: String,
    val settlementRemark: String, val receipt: ReceiptMetadata?,
    val voided: Boolean, val voidedAt: String, val voidReason: String,
)

data class OrderDraft(
    val localId: String, val companyId: String, val baseOrderId: String?,
    val expectedVersion: Long?, val payloadJson: String, val updatedAtMillis: Long,
)

data class SettlementDraft(
    val orderId: String, val expectedVersion: Long,
    val date: String, val time: String, val remark: String,
)

enum class BusinessCapability {
    VIEW_ORDERS, CREATE_ORDER, EDIT_ORDER, ADVANCE_ORDER_STATUS,
    VIEW_RECORDS, MANAGE_RECORDS, SETTLE_ORDER, REVERSE_SETTLEMENT,
    VOID_ORDER, MAINTAIN_RECEIPT, EXPORT_DATA,
}

data class OrderPage(
    val orders: List<OrderSummary>, val nextCursor: String?,
    val serverTime: String, val capabilities: Set<BusinessCapability>,
)
```

`OrderCommandResult.kt` 定义：

```kotlin
sealed interface OrderCommandResult<out T> {
    data class Success<T>(val value: T) : OrderCommandResult<T>
    data class ValidationFailure(val fieldErrors: Map<String, String>) : OrderCommandResult<Nothing>
    data object Unauthorized : OrderCommandResult<Nothing>
    data object Forbidden : OrderCommandResult<Nothing>
    data class Conflict(val latest: OrderDetail?) : OrderCommandResult<Nothing>
    data class UnknownResult(val operationId: String) : OrderCommandResult<Nothing>
    data object NetworkUnavailable : OrderCommandResult<Nothing>
    data object ServerFailure : OrderCommandResult<Nothing>
    data object MalformedResponse : OrderCommandResult<Nothing>
}
```

- [ ] **Step 4: 实现纯 Kotlin 状态机和权限映射**

```kotlin
data class OrderStatusTransition(val from: OrderStatus, val to: OrderStatus)

fun allowedOrderTransition(role: UserRole, from: OrderStatus, to: OrderStatus): Boolean {
    val forward = setOf(
        OrderStatusTransition(OrderStatus.IN_REPAIR, OrderStatus.COMPLETED),
        OrderStatusTransition(OrderStatus.COMPLETED, OrderStatus.PENDING_SETTLEMENT),
    )
    val backward = setOf(
        OrderStatusTransition(OrderStatus.COMPLETED, OrderStatus.IN_REPAIR),
        OrderStatusTransition(OrderStatus.PENDING_SETTLEMENT, OrderStatus.COMPLETED),
    )
    val transition = OrderStatusTransition(from, to)
    return transition in forward || (role == UserRole.ADMINISTRATOR && transition in backward)
}
```

把 `AppPermission` 补齐为主规格中的十一项，保留现有 `VIEW_ORDER` 名称避免无关迁移，并新增 `VIEW_RECORDS`、`MANAGE_RECORDS`、`EXPORT_DATA`。`PermissionSnapshot` 中 `repair` 映射现有四项，`history`/`insurance`/`customers` 映射 `VIEW_RECORDS`，`export` 映射 `EXPORT_DATA`；管理员仍拥有所有枚举。

- [ ] **Step 5: 添加模型金额与未知状态测试并运行 GREEN**

`OrderModelsTest` 断言 `OrderStatus.fromWire(" 未知 ") == null`、金额字段只接受 `Long` 分值、`ReceiptMetadata` 不含对象键或 URL 字段。

Run:

```powershell
E:\codex\APP\.android-build\gradle\gradle-8.10.2\bin\gradle.bat :app:testDebugUnitTest
```

Expected: 所有 JVM 测试通过，旧权限测试同步通过。

- [ ] **Step 6: 更新交接、提交并推送**

在交接文档记录领域模型、精确状态矩阵、权限映射和测试数。

```powershell
git add android-client/app/src/main/java/com/chengxu/autoservice/core/orders/model android-client/app/src/test/java/com/chengxu/autoservice/core/orders/model android-client/app/src/main/java/com/chengxu/autoservice/core/model/AppPermission.kt android-client/app/src/main/java/com/chengxu/autoservice/core/session/PermissionSnapshot.kt android-client/app/src/test/java/com/chengxu/autoservice/core/session/PermissionSnapshotTest.kt docs/latest-handoff-prompt.md
git commit -m "feat(android): define complete order domain contracts"
git push origin codex/android-mobile-ui-atlas
```

---

### Task 2: D1 版本、幂等记录与能力开关迁移

**Files:**
- Create: `migrations/0010_android_order_foundation.sql`
- Create: `test/orderFoundationMigration.test.mjs`
- Modify: `docs/latest-handoff-prompt.md`

**Interfaces:**
- Consumes: 现有 `repair_orders.company_id`、`updated_at` 和 D1 migration 目录。
- Produces: `repair_orders.version`、`order_operations`、`company_capabilities` 及增量读取索引。

- [ ] **Step 1: 写迁移合同 RED 测试**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(new URL('../migrations/0010_android_order_foundation.sql', import.meta.url), 'utf8');

test('order foundation migration adds optimistic concurrency and idempotency', () => {
  assert.match(sql, /ALTER TABLE repair_orders ADD COLUMN version INTEGER NOT NULL DEFAULT 1/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS order_operations/);
  assert.match(sql, /PRIMARY KEY \(company_id, actor, action, operation_id\)/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS company_capabilities/);
  assert.match(sql, /idx_repair_orders_company_updated/);
});
```

- [ ] **Step 2: 运行 RED**

Run: `node --test test/orderFoundationMigration.test.mjs`

Expected: FAIL with `ENOENT` for `0010_android_order_foundation.sql`。

- [ ] **Step 3: 添加可重复部署的迁移**

```sql
ALTER TABLE repair_orders ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS order_operations (
  company_id TEXT NOT NULL,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  operation_id TEXT NOT NULL,
  target_id TEXT NOT NULL DEFAULT '',
  request_hash TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('started', 'completed', 'failed')),
  http_status INTEGER NOT NULL DEFAULT 0,
  response_json TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (company_id, actor, action, operation_id)
);

CREATE TABLE IF NOT EXISTS company_capabilities (
  company_id TEXT NOT NULL,
  capability TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (company_id, capability)
);

CREATE INDEX IF NOT EXISTS idx_repair_orders_company_updated
  ON repair_orders(company_id, updated_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_repair_orders_company_status_updated
  ON repair_orders(company_id, status, voided, updated_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_order_operations_target
  ON order_operations(company_id, target_id, updated_at DESC);

INSERT OR IGNORE INTO company_capabilities(company_id, capability, enabled)
SELECT DISTINCT company_id, 'VIEW_ORDERS', 1 FROM repair_orders;
```

不要给写入能力设置默认开启；后续阶段在对应功能上线时显式开启。

- [ ] **Step 4: 验证迁移合同和本地 D1 应用**

Run:

```powershell
node --test test/orderFoundationMigration.test.mjs
npx.cmd wrangler d1 migrations apply chengxu-db --local
```

Expected: Node 测试 PASS；Wrangler 报告 `0010_android_order_foundation.sql` 成功应用。若本机已有旧本地 D1 状态，先记录输出，不删除生产或远端数据。

- [ ] **Step 5: 运行网页/Functions 全量测试**

Run: `npm.cmd test`

Expected: 所有既有 Node 测试和新迁移测试通过。

- [ ] **Step 6: 更新交接、提交并推送**

```powershell
git add migrations/0010_android_order_foundation.sql test/orderFoundationMigration.test.mjs docs/latest-handoff-prompt.md
git commit -m "feat(api): add order foundation migration"
git push origin codex/android-mobile-ui-atlas
```

---

### Task 3: Cloudflare 状态、能力、游标与幂等基础函数

**Files:**
- Create: `functions/_shared/order-foundation.js`
- Create: `test/orderFoundationLogic.test.mjs`
- Modify: `shared/orderStatusPermissions.js`
- Modify: `test/orderStatusPermissions.test.mjs`
- Modify: `docs/latest-handoff-prompt.md`

**Interfaces:**
- Consumes: `session.role`、`session.permissions`、D1 `company_capabilities` 和 `order_operations`。
- Produces: `canTransitionOrderStatus`、`readCapabilities`、`encodeOrderCursor`、`decodeOrderCursor`、`findOperation`、`beginOperation`、`completeOperation`。

- [ ] **Step 1: 写服务端基础逻辑 RED 测试**

覆盖：员工只能相邻向前、管理员可相邻回退、无效/跨级拒绝；游标往返且非法游标返回 `null`；能力必须同时满足数据库开启和角色权限；同一 `company+actor+action+operationId` 可返回已完成结果。

```js
test('cursor round trips updatedAt and id', () => {
  const cursor = encodeOrderCursor({ updatedAt: '2026-07-20 10:00:00', id: 'RO-1' });
  assert.deepEqual(decodeOrderCursor(cursor), { updatedAt: '2026-07-20 10:00:00', id: 'RO-1' });
  assert.equal(decodeOrderCursor('not-base64'), null);
});
```

- [ ] **Step 2: 运行 RED**

Run: `node --test test/orderFoundationLogic.test.mjs test/orderStatusPermissions.test.mjs`

Expected: FAIL because the new shared module and transition function do not exist。

- [ ] **Step 3: 实现状态和游标纯函数**

在 `shared/orderStatusPermissions.js` 保留 `canEmployeeSetOrderStatus` 兼容导出，并新增：

```js
const FORWARD = new Set(['在修中->已完工', '已完工->待结算']);
const BACKWARD = new Set(['已完工->在修中', '待结算->已完工']);

export function canTransitionOrderStatus(role, from, to) {
  const key = `${String(from || '').trim()}->${String(to || '').trim()}`;
  return FORWARD.has(key) || (role === 'admin' && BACKWARD.has(key));
}
```

在 `order-foundation.js` 使用 UTF-8 JSON 的 base64url 游标，Node 和 Workers 均通过 `btoa`/`atob` 可用；解析时验证对象只有非空 `updatedAt` 和 `id` 字符串。

- [ ] **Step 4: 实现能力与幂等存取函数**

能力函数精确返回字符串数组，并先按会话权限过滤：员工可获得 `VIEW_ORDERS`、`CREATE_ORDER`、`EDIT_ORDER`、`ADVANCE_ORDER_STATUS`、`VIEW_RECORDS`；管理员可获得全部能力。D1 未配置时仅 `VIEW_ORDERS` 默认开启。

```js
export async function findOperation(env, key) {
  return env.DB.prepare(`SELECT state, http_status, response_json FROM order_operations
    WHERE company_id = ? AND actor = ? AND action = ? AND operation_id = ?`)
    .bind(key.companyId, key.actor, key.action, key.operationId).first();
}

export async function beginOperation(env, key, requestHash, targetId = '') {
  return env.DB.prepare(`INSERT OR IGNORE INTO order_operations
    (company_id, actor, action, operation_id, target_id, request_hash, state)
    VALUES (?, ?, ?, ?, ?, ?, 'started')`)
    .bind(key.companyId, key.actor, key.action, key.operationId, targetId, requestHash).run();
}

export async function completeOperation(env, key, httpStatus, response) {
  return env.DB.prepare(`UPDATE order_operations SET state = 'completed', http_status = ?,
    response_json = ?, updated_at = CURRENT_TIMESTAMP
    WHERE company_id = ? AND actor = ? AND action = ? AND operation_id = ?`)
    .bind(httpStatus, JSON.stringify(response), key.companyId, key.actor, key.action, key.operationId).run();
}
```

`actor` 使用认证会话中的 `username || label`；任何后续写命令都必须先校验已存在操作的 `request_hash`，不同请求体复用同一 ID 返回 409。

- [ ] **Step 5: 运行聚焦与全量测试**

Run:

```powershell
node --test test/orderFoundationLogic.test.mjs test/orderStatusPermissions.test.mjs
npm.cmd test
```

Expected: 聚焦和全量 Node 测试全部 PASS，现有网页状态权限合同不回归。

- [ ] **Step 6: 更新交接、提交并推送**

```powershell
git add functions/_shared/order-foundation.js shared/orderStatusPermissions.js test/orderFoundationLogic.test.mjs test/orderStatusPermissions.test.mjs docs/latest-handoff-prompt.md
git commit -m "feat(api): add order capability and idempotency foundation"
git push origin codex/android-mobile-ui-atlas
```

---

### Task 4: 兼容的 current/history 分页与详情读取 API

**Files:**
- Modify: `functions/api/orders.js`
- Create: `functions/api/orders/[id]/index.js`
- Create: `test/ordersReadApi.test.mjs`
- Modify: `docs/latest-handoff-prompt.md`

**Interfaces:**
- Consumes: `readCapabilities`、`encodeOrderCursor`、`decodeOrderCursor`、`requireSession`、`toOrder`。
- Produces: legacy `{ orders }`；extended `{ orders, nextCursor, serverTime, capabilities }`；detail `{ order, serverTime, capabilities }`。

- [ ] **Step 1: 写读取 API RED 测试**

使用记录 SQL 与 bind 参数的 Fake D1，覆盖：

1. 无 `scope` 保持原 SQL、排序和 `{orders}` 结构；
2. `scope=current` 只查三种普通状态和 `voided=0`；
3. `scope=history` 只查 `已结算` 和 `voided=0`；
4. `limit` 默认 50，最大 100，多取一行生成 `nextCursor`；
5. `updatedAfter` 和 cursor 都作为公司隔离查询条件；
6. 详情必须同时按 `id` 和会话 `company_id` 查询，缺失为 404；
7. 响应包含 `version`，但不暴露 `settlement_receipt_key`。

- [ ] **Step 2: 运行 RED**

Run: `node --test test/ordersReadApi.test.mjs`

Expected: FAIL because extended scope handling and detail route are absent。

- [ ] **Step 3: 抽出并导出安全映射**

保留现有 `toOrder` 的全部字段和命名作为 legacy 映射，并把它改为命名导出。另增加只供新 Android 读取端点使用的安全映射：

```js
export function toMobileOrder(row) {
  const legacy = toOrder(row);
  const {
    settlementReceiptKey: _receiptKey,
    settlementReceiptName: _receiptName,
    settlementReceiptType: _receiptType,
    settlementReceiptSize: _receiptSize,
    settlementReceiptUploadedAt: _receiptUploadedAt,
    ...safe
  } = legacy;
  return {
    ...safe,
    version: Number(row.version) || 1,
    updatedAt: row.updated_at || '',
    receipt: row.settlement_receipt_name ? {
      name: row.settlement_receipt_name,
      contentType: row.settlement_receipt_type || '',
      sizeBytes: Number(row.settlement_receipt_size) || 0,
      uploadedAt: row.settlement_receipt_uploaded_at || '',
    } : null,
  };
}
```

legacy 无参数分支继续调用 `toOrder`，因此网页/Windows 仍得到既有回执字段；新 scoped/detail 分支只调用 `toMobileOrder`，不暴露 COS 对象键。

- [ ] **Step 4: 实现扩展列表且保留 legacy 分支**

```js
export async function onRequestGet({ request, env }) {
  const { session, error } = await requireSession(request, env);
  if (error) return error;
  const url = new URL(request.url);
  const scope = url.searchParams.get('scope');
  if (!scope) return readLegacyOrders(env, session);
  if (!['current', 'history'].includes(scope)) return json({ error: 'INVALID_SCOPE' }, { status: 400 });
  return readScopedOrders({ url, env, session, scope });
}
```

`readScopedOrders` 使用 `updated_at DESC, id DESC`，`limit + 1` 取数，`limit` 截断到 1..100；cursor 条件为 `(updated_at < ? OR (updated_at = ? AND id < ?))`。`updatedAfter` 仅接受可解析的 ISO/SQLite 时间字符串，否则返回 `400 INVALID_UPDATED_AFTER`。同时传 cursor 与 `updatedAfter` 返回 `400 AMBIGUOUS_PAGINATION`，避免丢数。

- [ ] **Step 5: 实现公司隔离详情**

`functions/api/orders/[id]/index.js`：

```js
import { json, requireSession } from '../../../_shared/auth.js';
import { readCapabilities } from '../../../_shared/order-foundation.js';
import { toMobileOrder } from '../../orders.js';

export async function onRequestGet({ request, env, params }) {
  const { session, error } = await requireSession(request, env);
  if (error) return error;
  const order = await env.DB.prepare(
    'SELECT * FROM repair_orders WHERE id = ? AND company_id = ? AND voided = 0',
  ).bind(String(params.id || ''), session.company_id || 'tongda').first();
  if (!order) return json({ error: 'ORDER_NOT_FOUND' }, { status: 404 });
  return json({
    order: toMobileOrder(order),
    serverTime: new Date().toISOString(),
    capabilities: await readCapabilities(env, session),
  });
}
```

- [ ] **Step 6: 运行聚焦、全量测试和生产构建**

Run:

```powershell
node --test test/ordersReadApi.test.mjs
npm.cmd test
npm.cmd run build
```

Expected: API 聚焦测试、全量 Node 测试和 Vite 生产构建全部通过。

- [ ] **Step 7: 更新交接、提交并推送**

```powershell
git add functions/api/orders.js functions/api/orders/[id]/index.js test/ordersReadApi.test.mjs docs/latest-handoff-prompt.md
git commit -m "feat(api): add scoped order reads"
git push origin codex/android-mobile-ui-atlas
```

---

### Task 5: Android 扩展读取网络契约与容错映射

**Files:**
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/orders/OrderReadApi.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/orders/HttpUrlConnectionOrderReadApi.kt`
- Create: `android-client/app/src/test/java/com/chengxu/autoservice/core/orders/HttpUrlConnectionOrderReadApiTest.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/core/orders/OrdersApi.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/core/orders/HttpUrlConnectionOrdersApi.kt`
- Modify: `docs/latest-handoff-prompt.md`

**Interfaces:**
- Consumes: Task 1 `OrderPage`/`OrderDetail`/`BusinessCapability` 和 Task 4 API envelopes。
- Produces: `OrderReadApi.fetchPage`、`OrderReadApi.fetchDetail`；旧 `OrdersApi.fetch` 继续返回 `RepairOrder`。

- [ ] **Step 1: 写网络契约 RED 测试**

测试精确 URL 编码、Bearer Token、current/history/cursor/updatedAfter、完整详情映射、未知字段忽略、非法必填字段导致 `MalformedResponse`、可选字段安全默认、401/403/404/5xx、IOException 和取消传播。禁止把手机号/VIN 写到日志断言中。

- [ ] **Step 2: 运行 RED**

Run:

```powershell
E:\codex\APP\.android-build\gradle\gradle-8.10.2\bin\gradle.bat :app:testDebugUnitTest --tests "*HttpUrlConnectionOrderReadApiTest"
```

Expected: FAIL because `OrderReadApi` and implementation are absent。

- [ ] **Step 3: 定义精确读取接口**

```kotlin
data class OrderPageQuery(
    val scope: OrderScope,
    val cursor: String? = null,
    val updatedAfter: String? = null,
    val limit: Int = 50,
) {
    init {
        require(limit in 1..100)
        require(cursor == null || updatedAfter == null)
    }
}

sealed interface OrderReadFailure {
    data object Unauthorized : OrderReadFailure
    data object Forbidden : OrderReadFailure
    data object NotFound : OrderReadFailure
    data object NetworkUnavailable : OrderReadFailure
    data object ServerError : OrderReadFailure
    data object MalformedResponse : OrderReadFailure
}

sealed interface OrderReadResult<out T> {
    data class Success<T>(val value: T) : OrderReadResult<T>
    data class Failure(val reason: OrderReadFailure) : OrderReadResult<Nothing>
}

interface OrderReadApi {
    suspend fun fetchPage(token: String, query: OrderPageQuery): OrderReadResult<OrderPage>
    suspend fun fetchDetail(token: String, orderId: String): OrderReadResult<OrderDetail>
}
```

- [ ] **Step 4: 实现 URL 和 JSON 映射**

复用现有 `OrdersHttpTransport`，新增 `encodeURIComponent` 等价的 `URLEncoder.encode(value, UTF_8).replace("+", "%20")`。列表 URL 固定参数顺序：`scope=${query.scope.name.lowercase()}`、`limit`、`cursor` 或 `updatedAfter`。详情 ID 必须编码为单一路径段。

JSON 映射要求：`id/companyId/date/status/version/updatedAt` 缺失或类型非法则丢弃该行；详情缺少任何必需摘要字段则整个详情返回 `MalformedResponse`；金额继续使用整数分优先，兼容旧 decimal 字段。`receipt` 只映射元数据。

- [ ] **Step 5: 保留旧 API 适配器**

`HttpUrlConnectionOrdersApi.fetch(token)` 继续请求无参数 `/api/orders`，不改变现有仓库行为。把共享的 JSON 基础解析移到 internal 函数，避免复制金额、日期和字符串容错规则；旧 `RepairOrder` 从 `OrderSummary` 映射时保持全部现有字段。

- [ ] **Step 6: 运行聚焦和 Android JVM 全量测试**

Run:

```powershell
E:\codex\APP\.android-build\gradle\gradle-8.10.2\bin\gradle.bat :app:testDebugUnitTest --tests "*HttpUrlConnectionOrderReadApiTest" --tests "*HttpUrlConnectionOrdersApiTest"
E:\codex\APP\.android-build\gradle\gradle-8.10.2\bin\gradle.bat :app:testDebugUnitTest
```

Expected: 新旧网络测试和 JVM 全量测试通过。

- [ ] **Step 7: 更新交接、提交并推送**

```powershell
git add android-client/app/src/main/java/com/chengxu/autoservice/core/orders android-client/app/src/test/java/com/chengxu/autoservice/core/orders docs/latest-handoff-prompt.md
git commit -m "feat(android): add extended order read API"
git push origin codex/android-mobile-ui-atlas
```

---

### Task 6: 通用 AES-GCM 字段加密边界

**Files:**
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/security/StringCipher.kt`
- Create: `android-client/app/src/androidTest/java/com/chengxu/autoservice/core/security/AndroidKeystoreStringCipherTest.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/core/auth/SessionCipher.kt`
- Modify: `android-client/app/src/test/java/com/chengxu/autoservice/core/auth/EncryptedSessionStoreTest.kt`
- Modify: `docs/latest-handoff-prompt.md`

**Interfaces:**
- Consumes: 现有 Android Keystore AES/GCM/NoPadding 行为。
- Produces: `StringCipher`、`AesGcmStringCipher`、`androidKeystoreStringCipher(alias)`；`SessionCipher` 保持兼容代理。

- [ ] **Step 1: 写通用字段加密 RED 测试**

```kotlin
@Test fun samePlaintextUsesDifferentIvAndRoundTrips() {
    val cipher = androidKeystoreStringCipher(alias)
    val first = cipher.encrypt("15000000000")
    val second = cipher.encrypt("15000000000")
    assertNotEquals(first, second)
    assertEquals("15000000000", cipher.decrypt(first))
    assertEquals("15000000000", cipher.decrypt(second))
}
```

再添加损坏密文抛出受控异常、空字符串可往返测试。测试 finally 删除唯一 alias。

- [ ] **Step 2: 编译 RED 测试代码**

Run:

```powershell
E:\codex\APP\.android-build\gradle\gradle-8.10.2\bin\gradle.bat :app:compileDebugAndroidTestKotlin
```

Expected: FAIL because `androidKeystoreStringCipher` does not exist。

- [ ] **Step 3: 提取通用加密实现并兼容会话**

`StringCipher.kt` 定义：

```kotlin
interface StringCipher {
    fun encrypt(plaintext: String): String
    fun decrypt(ciphertext: String): String
}

class AesGcmStringCipher(private val keyProvider: () -> SecretKey) : StringCipher

fun androidKeystoreStringCipher(alias: String): StringCipher =
    AesGcmStringCipher { getOrCreateAndroidKeystoreAesKey(alias) }
```

把现有 12-byte IV、128-bit tag、256-bit Android Keystore key 的实现原样迁入通用文件。`SessionCipher` 保留接口，使用私有 adapter 委托给 `StringCipher`，默认 alias 仍是 `autoservice_auth_session`，避免已有登录会话不可解密。订单字段默认 alias 使用 `autoservice_order_fields_v1`。

- [ ] **Step 4: 运行 JVM、Android 测试源码编译和 Lint**

Run:

```powershell
E:\codex\APP\.android-build\gradle\gradle-8.10.2\bin\gradle.bat :app:testDebugUnitTest :app:compileDebugAndroidTestKotlin :app:lintDebug
```

Expected: JVM 全量通过，Android 测试源码编译成功，Lint 0 error。不要启动模拟器执行 Keystore 测试。

- [ ] **Step 5: 更新交接、提交并推送**

```powershell
git add android-client/app/src/main/java/com/chengxu/autoservice/core/security android-client/app/src/androidTest/java/com/chengxu/autoservice/core/security android-client/app/src/main/java/com/chengxu/autoservice/core/auth/SessionCipher.kt android-client/app/src/test/java/com/chengxu/autoservice/core/auth/EncryptedSessionStoreTest.kt docs/latest-handoff-prompt.md
git commit -m "refactor(android): share keystore field cipher"
git push origin codex/android-mobile-ui-atlas
```

---

### Task 7: Room v2 摘要、详情、草稿、游标与档案基础表

**Files:**
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/core/orders/cache/AutoserviceDatabase.kt`
- Rename/Replace: `android-client/app/src/main/java/com/chengxu/autoservice/core/orders/cache/OrderEntity.kt` -> `OrderSummaryEntity.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/core/orders/cache/OrderDao.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/orders/cache/OrderDetailEntity.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/orders/cache/OrderDraftEntity.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/orders/cache/SyncCursorEntity.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/orders/cache/CustomerVehicleEntity.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/orders/cache/InsurancePolicyEntity.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/orders/cache/FoundationDao.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/orders/cache/EncryptedOrderStore.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/core/orders/cache/RoomOrderCache.kt`
- Modify: `android-client/app/src/androidTest/java/com/chengxu/autoservice/core/orders/cache/OrderDaoTest.kt`
- Create: `android-client/app/src/androidTest/java/com/chengxu/autoservice/core/orders/cache/AutoserviceDatabaseMigrationTest.kt`
- Create: `android-client/app/src/androidTest/java/com/chengxu/autoservice/core/orders/cache/FoundationDaoTest.kt`
- Generate: `android-client/app/schemas/com.chengxu.autoservice.core.orders.cache.AutoserviceDatabase/2.json`
- Modify: `docs/latest-handoff-prompt.md`

**Interfaces:**
- Consumes: Task 1 models and Task 6 `StringCipher`。
- Produces: `MIGRATION_1_2`、`OrderDao` 摘要兼容接口、`FoundationDao`、`EncryptedOrderStore`。

- [ ] **Step 1: 写 Room v2 RED 测试源码**

迁移测试先建立 v1 `orders` 行，执行 `MIGRATION_1_2` 后断言：数据进入 `order_summaries`、`version=1`、`updatedAt=''`、`scope='CURRENT'`。DAO 测试覆盖公司隔离、current/history 隔离、详情 upsert、草稿加密载荷、游标 upsert、清理单公司和 `clearAll`。

- [ ] **Step 2: 编译 RED**

Run: `E:\codex\APP\.android-build\gradle\gradle-8.10.2\bin\gradle.bat :app:compileDebugAndroidTestKotlin`

Expected: FAIL with missing v2 entities, DAO and migration。

- [ ] **Step 3: 定义 v2 实体和 DAO**

摘要表使用复合主键：

```kotlin
@Entity(
    tableName = "order_summaries",
    primaryKeys = ["companyId", "orderId"],
    indices = [Index("companyId", "scope", "dateSortKey", "time")],
)
data class OrderSummaryEntity(
    val companyId: String, val orderId: String, val scope: String,
    val version: Long, val date: String, val dateSortKey: String, val time: String,
    val plate: String, val customer: String, val car: String, val type: String,
    val status: String, val amountCents: Long, val record: String,
    val insuranceExpiry: String, val delivery: String, val updatedAt: String,
)
```

其余实体使用以下精确字段；详情表不包含 receipt key/URL，草稿和档案表只落加密 payload：

```kotlin
@Entity(tableName = "order_details", primaryKeys = ["companyId", "orderId"])
data class OrderDetailEntity(
    val companyId: String, val orderId: String, val version: Long,
    val date: String, val dateSortKey: String, val time: String,
    val plate: String, val customer: String, val car: String, val type: String,
    val status: String, val amountCents: Long, val record: String,
    val insuranceExpiry: String, val delivery: String, val updatedAt: String,
    val encryptedPhone: String, val insurer: String, val staff: String,
    val encryptedVin: String, val claimNo: String, val accidentType: String,
    val paymentMethod: String, val remark: String,
    val laborCents: Long, val materialCents: Long,
    val settlementDate: String, val settlementTime: String,
    val settlementRemark: String, val receiptName: String,
    val receiptContentType: String, val receiptSizeBytes: Long,
    val receiptUploadedAt: String, val voided: Boolean,
    val voidedAt: String, val voidReason: String,
)

@Entity(tableName = "order_drafts", primaryKeys = ["companyId", "localId"])
data class OrderDraftEntity(
    val companyId: String, val localId: String, val baseOrderId: String?,
    val expectedVersion: Long?, val encryptedPayload: String, val updatedAtMillis: Long,
)

@Entity(tableName = "sync_cursors", primaryKeys = ["companyId", "resource"])
data class SyncCursorEntity(
    val companyId: String, val resource: String, val cursor: String,
    val serverTime: String, val updatedAtMillis: Long,
)

@Entity(tableName = "customer_vehicles", primaryKeys = ["companyId", "recordId"])
data class CustomerVehicleEntity(
    val companyId: String, val recordId: String,
    val encryptedPayload: String, val updatedAt: String,
)

@Entity(tableName = "insurance_policies", primaryKeys = ["companyId", "recordId"])
data class InsurancePolicyEntity(
    val companyId: String, val recordId: String,
    val encryptedPayload: String, val updatedAt: String,
)
```

`FoundationDao` 提供以下精确方法：

```kotlin
@Dao
interface FoundationDao {
    @Query("SELECT * FROM order_details WHERE companyId = :companyId AND orderId = :orderId")
    suspend fun getDetail(companyId: String, orderId: String): OrderDetailEntity?
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertDetail(entity: OrderDetailEntity)
    @Query("DELETE FROM order_details WHERE companyId = :companyId AND orderId = :orderId")
    suspend fun deleteDetail(companyId: String, orderId: String)
    @Query("SELECT * FROM order_drafts WHERE companyId = :companyId ORDER BY updatedAtMillis DESC")
    fun observeDrafts(companyId: String): Flow<List<OrderDraftEntity>>
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertDraft(entity: OrderDraftEntity)
    @Query("DELETE FROM order_drafts WHERE companyId = :companyId AND localId = :localId")
    suspend fun deleteDraft(companyId: String, localId: String)
    @Query("SELECT * FROM sync_cursors WHERE companyId = :companyId AND resource = :resource")
    suspend fun getCursor(companyId: String, resource: String): SyncCursorEntity?
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertCursor(entity: SyncCursorEntity)
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertVehicles(rows: List<CustomerVehicleEntity>)
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertPolicies(rows: List<InsurancePolicyEntity>)
    @Query("DELETE FROM order_details WHERE companyId = :companyId")
    suspend fun deleteDetailsByCompany(companyId: String)
    @Query("DELETE FROM order_drafts WHERE companyId = :companyId")
    suspend fun deleteDraftsByCompany(companyId: String)
    @Query("DELETE FROM sync_cursors WHERE companyId = :companyId")
    suspend fun deleteCursorsByCompany(companyId: String)
    @Query("DELETE FROM customer_vehicles WHERE companyId = :companyId")
    suspend fun deleteVehiclesByCompany(companyId: String)
    @Query("DELETE FROM insurance_policies WHERE companyId = :companyId")
    suspend fun deletePoliciesByCompany(companyId: String)

    @Transaction
    suspend fun deleteFoundationByCompany(companyId: String) {
        deleteDetailsByCompany(companyId); deleteDraftsByCompany(companyId)
        deleteCursorsByCompany(companyId); deleteVehiclesByCompany(companyId)
        deletePoliciesByCompany(companyId)
    }

    @Query("DELETE FROM order_details") suspend fun clearDetails()
    @Query("DELETE FROM order_drafts") suspend fun clearDrafts()
    @Query("DELETE FROM sync_cursors") suspend fun clearCursors()
    @Query("DELETE FROM customer_vehicles") suspend fun clearVehicles()
    @Query("DELETE FROM insurance_policies") suspend fun clearPolicies()

    @Transaction
    suspend fun clearAllFoundation() {
        clearDetails(); clearDrafts(); clearCursors(); clearVehicles(); clearPolicies()
    }
}
```

- [ ] **Step 4: 实现显式 MIGRATION_1_2**

迁移按以下顺序：新建 `order_summaries`；从 `orders` 复制并填充默认字段；删除旧表；创建索引；创建详情、草稿、游标、车辆和保险表。`AutoserviceDatabase.create()` 必须 `.addMigrations(MIGRATION_1_2)`，禁止 destructive migration fallback。

- [ ] **Step 5: 实现加密映射边界**

```kotlin
class EncryptedOrderStore(
    private val dao: FoundationDao,
    private val cipher: StringCipher,
) {
    suspend fun upsertDetail(detail: OrderDetail) = dao.upsertDetail(detail.toEntity(cipher))
    suspend fun getDetail(companyId: String, orderId: String): OrderDetail? =
        dao.getDetail(companyId, orderId)?.toDomain(cipher)
    suspend fun upsertDraft(draft: OrderDraft) = dao.upsertDraft(draft.toEntity(cipher))
}
```

映射必须在 DAO 外完成；解密失败返回 `null` 并删除损坏的对应行，不把异常或明文写入日志。`RoomOrderCache` 改用 `OrderSummaryEntity`，但继续向现有 UI 提供 `RepairOrder`。

- [ ] **Step 6: 生成 Schema v2 并编译 Android 测试**

Run:

```powershell
E:\codex\APP\.android-build\gradle\gradle-8.10.2\bin\gradle.bat :app:kspDebugKotlin :app:compileDebugAndroidTestKotlin
```

Expected: 生成 Schema v2，Room 验证通过，所有 Android 测试源码成功编译。不得声称连接式 migration/DAO 测试已经执行。

- [ ] **Step 7: 运行 JVM、Lint 和 APK 构建回归**

Run:

```powershell
E:\codex\APP\.android-build\gradle\gradle-8.10.2\bin\gradle.bat :app:testDebugUnitTest :app:lintDebug :app:assembleDebug
```

Expected: JVM 全量通过，Lint 0 error，Debug APK 构建成功，现有只读仓库编译兼容。

- [ ] **Step 8: 更新交接、提交并推送**

```powershell
git add android-client/app/src/main/java/com/chengxu/autoservice/core/orders/cache android-client/app/src/androidTest/java/com/chengxu/autoservice/core/orders/cache android-client/app/schemas docs/latest-handoff-prompt.md
git commit -m "feat(android): add encrypted room order foundation"
git push origin codex/android-mobile-ui-atlas
```

---

### Task 8: 生产兼容接线、全量验证与阶段 APK

**Files:**
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/MainActivity.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/core/auth/AuthenticatedDataCleaner.kt`
- Modify: `android-client/app/src/test/java/com/chengxu/autoservice/core/orders/CachedOrdersRepositoryTest.kt`
- Modify: `android-client/app/src/androidTest/java/com/chengxu/autoservice/AutoserviceAppTest.kt`
- Modify: `docs/android-client.md`
- Modify: `docs/latest-handoff-prompt.md`
- Update: `dist/releases/android/autoservice-android-debug-0.1.0.apk`

**Interfaces:**
- Consumes: Room v2、扩展读取 API、通用字段加密和现有认证清理生命周期。
- Produces: 不改变生产 UI 的可安装阶段 1 APK，以及完整测试/哈希/签名证据。

- [ ] **Step 1: 写生产接线 RED 契约**

测试或源码合同必须断言：数据库创建包含 `MIGRATION_1_2`；订单字段 cipher 使用独立 alias；认证退出/401/跨企业切换清理 summary、detail、draft、cursor、车辆和保险表；现有 `CachedOrdersRepository` 仍只请求 legacy `/api/orders`，不改变用户列表。

```kotlin
@Test fun compositeCleanerClearsEachStoreInOrder() = runTest {
    val events = mutableListOf<String>()
    CompositeAuthenticatedDataCleaner(
        listOf(
            AuthenticatedDataCleaner { events += "summary" },
            AuthenticatedDataCleaner { events += "foundation" },
        ),
    ).clear()
    assertEquals(listOf("summary", "foundation"), events)
}
```

- [ ] **Step 2: 运行 RED**

Run:

```powershell
E:\codex\APP\.android-build\gradle\gradle-8.10.2\bin\gradle.bat :app:testDebugUnitTest :app:compileDebugAndroidTestKotlin
```

Expected: 新清理/装配契约在生产接线前失败。

- [ ] **Step 3: 完成最小生产接线**

在 `AuthenticatedDataCleaner.kt` 增加：

```kotlin
class CompositeAuthenticatedDataCleaner(
    private val cleaners: List<AuthenticatedDataCleaner>,
) : AuthenticatedDataCleaner {
    override suspend fun clear() {
        cleaners.forEach { it.clear() }
    }
}
```

在 `MainActivity` 创建单例 `androidKeystoreStringCipher("autoservice_order_fields_v1")` 和 `EncryptedOrderStore`，但阶段 1 不把写按钮或新页面接入 UI。认证仓库接收 `CompositeAuthenticatedDataCleaner(listOf(orderCache, AuthenticatedDataCleaner { database.foundationDao().clearAllFoundation() }))`；任何 `CancellationException` 继续原对象传播。

- [ ] **Step 4: 运行 Cloudflare/网页端全量验证**

Run:

```powershell
npm.cmd test
npm.cmd run build
```

Expected: 所有 Node 测试和 Vite 生产构建通过。

- [ ] **Step 5: 备份并迁移远端 D1，部署 Pages Functions**

执行前确认 Wrangler 登录账号和远端待应用列表，只允许出现本阶段 `0010_android_order_foundation.sql`。备份文件放在已被 Git 忽略的 `tmp/d1-backups/`，保留到真机验收完成。

```powershell
npx.cmd wrangler whoami
npx.cmd wrangler d1 migrations list chengxu-db --remote
New-Item -ItemType Directory -Force -Path tmp/d1-backups
npx.cmd wrangler d1 export chengxu-db --remote --output=tmp/d1-backups/pre-android-stage-1.sql
npx.cmd wrangler d1 migrations apply chengxu-db --remote
npx.cmd wrangler pages deploy dist --project-name chengxu
curl.exe -s -o NUL -w "%{http_code}" "https://chengxu.pages.dev/api/orders?scope=current"
```

Expected: Wrangler 账号/项目正确；远端备份成功；只应用 migration 0010；Pages 部署成功；未认证 scoped endpoint 返回 `401`。若待应用列表包含非本阶段 migration，停止部署并先核对远端迁移历史，不继续猜测。

- [ ] **Step 6: 从 clean 状态运行 Android 完整门禁**

Run in `android-client`:

```powershell
$env:JAVA_HOME='E:\codex\APP\.android-build\jdk\jdk-17.0.19+10'
$env:ANDROID_HOME='E:\codex\APP\.android-build\android-sdk'
E:\codex\APP\.android-build\gradle\gradle-8.10.2\bin\gradle.bat clean :app:testDebugUnitTest :app:compileDebugAndroidTestKotlin :app:lintDebug :app:assembleDebug --rerun-tasks
```

Expected: 全部 Gradle tasks `BUILD SUCCESSFUL`；记录 JVM suite/test 数、Lint Fatal/Error/Warning 数；明确 Android 测试只编译未连接执行。

- [ ] **Step 7: 发布、哈希并验证 APK**

把 `android-client/app/build/outputs/apk/debug/app-debug.apk` 复制为 `dist/releases/android/autoservice-android-debug-0.1.0.apk`，然后执行：

```powershell
Get-FileHash -Algorithm SHA256 dist/releases/android/autoservice-android-debug-0.1.0.apk
E:\codex\APP\.android-build\android-sdk\build-tools\35.0.0\apksigner.bat verify --verbose dist/releases/android/autoservice-android-debug-0.1.0.apk
```

Expected: 发布副本与构建源 SHA-256 一致，`Verified using v2 scheme: true`。

- [ ] **Step 8: 更新真机清单与交接**

`docs/android-client.md` 增加阶段 1 真机回归：登录、双公司隔离、当前工单不回归、离线缓存、退出清理、升级已有 v1 数据库后列表仍可读。说明新增写入入口尚未上线。交接文档记录所有验证结果、APK 路径/大小/哈希/签名和未执行项。

- [ ] **Step 9: 最终暂存检查、提交并推送**

```powershell
git diff --check
git add android-client docs/android-client.md docs/latest-handoff-prompt.md dist/releases/android/autoservice-android-debug-0.1.0.apk
git diff --cached --check
git commit -m "build(android): release stage 1 data foundation"
git push origin codex/android-mobile-ui-atlas
git status --short
git rev-parse HEAD
git rev-parse origin/codex/android-mobile-ui-atlas
```

Expected: 工作区干净，本地与远端完整哈希一致。

## Stage 1 Completion Gate

- Android 领域类型、普通状态矩阵和权限映射都有 JVM 测试。
- D1 `version`、幂等操作记录和公司能力表可由本地 migration 应用。
- 旧 `/api/orders` 客户端保持兼容，新 current/history/detail 读取具备公司隔离、分页和增量契约。
- Android 扩展读取 API 对 401、403、404、网络、服务器和畸形响应有稳定映射。
- Room v1 -> v2 显式迁移保留既有摘要，详情/草稿/游标/档案表公司隔离。
- 手机号、VIN 和草稿载荷通过独立 Keystore alias 加密；Room 不保存回执对象键、二进制或短期 URL。
- 现有只读工单 UI 和工作台继续使用真实缓存数据，不出现任何未授权写入口。
- Node 测试、Vite build、Android JVM、Android 测试源码编译、Lint、APK build 全部通过。
- 远端 D1 已备份并只应用 migration 0010，Pages Functions 已部署，生产 scoped endpoint 未认证门禁为 401。
- 可安装 APK 已发布、哈希一致、v2 签名有效，且未启动模拟器的事实有明确记录。
