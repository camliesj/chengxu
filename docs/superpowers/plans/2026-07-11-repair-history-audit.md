# Repair Archive And Audit Log Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically separate unsettled repair work from settled history, provide direct compact history actions, and replace raw duplicate operation logs with Beijing-time business events.

**Architecture:** Keep repair orders in one data source and derive reception/history views from status. Add pure frontend modules for filtering, pagination, timestamp formatting, and legacy-log grouping; extend Cloudflare APIs with event identifiers, field-level change summaries, archive-edit enforcement, and idempotent audit writes.

**Tech Stack:** React 19, Vite 6, Cloudflare Pages Functions, D1 SQLite, Node built-in test runner.

## Global Constraints

- `在修中`、`已完工`、`待结算` appear only in repair reception; `已结算` appears only in history.
- Returning a settlement moves the order back to repair reception without duplicating data.
- History editing is admin-only and cannot directly change status, settlement data, payment method, or receipt metadata.
- History desktop tables must fit without horizontal scrolling.
- Audit timestamps remain UTC in D1 and display in `Asia/Shanghai`.
- One user command creates one primary business event; old raw logs remain expandable.

---

### Task 1: Status-derived repair and history views

**Files:**
- Create: `src/repairHistoryLogic.js`
- Create: `test/repairHistoryLogic.test.mjs`
- Modify: `src/App.jsx`

**Interfaces:**
- Produces: `isReceptionOrder(order)`, `isHistoryOrder(order)`, `filterHistoryOrders(orders, filters)`, and `paginateRows(rows, page, pageSize)`.
- Consumes: normalized order objects already used by `App.jsx`.

- [ ] **Step 1: Write failing status and pagination tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { isReceptionOrder, isHistoryOrder, paginateRows } from '../src/repairHistoryLogic.js';

test('settled orders are history-only', () => {
  const settled = { status: '已结算' };
  assert.equal(isReceptionOrder(settled), false);
  assert.equal(isHistoryOrder(settled), true);
});

test('unsettled orders are reception-only', () => {
  for (const status of ['在修中', '已完工', '待结算']) {
    assert.equal(isReceptionOrder({ status }), true);
    assert.equal(isHistoryOrder({ status }), false);
  }
});

test('pagination clamps to the available page range', () => {
  const result = paginateRows([1, 2, 3], 9, 2);
  assert.deepEqual(result.rows, [3]);
  assert.equal(result.page, 2);
  assert.equal(result.pageCount, 2);
});
```

- [ ] **Step 2: Run the test and verify module-not-found failure**

Run: `node --test test/repairHistoryLogic.test.mjs`

- [ ] **Step 3: Implement the pure status and pagination functions**

```js
export const SETTLED_STATUS = '已结算';
export const isReceptionOrder = (order) => order?.status !== SETTLED_STATUS;
export const isHistoryOrder = (order) => order?.status === SETTLED_STATUS;

export function paginateRows(rows, requestedPage, pageSize) {
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const page = Math.min(Math.max(1, requestedPage), pageCount);
  return { rows: rows.slice((page - 1) * pageSize, page * pageSize), page, pageCount };
}
```

- [ ] **Step 4: Use the helpers in `App.jsx`**

Pass only reception orders to `RepairReception` and settled orders to `HistoryQueryPage`. Do not mutate or copy order records.

- [ ] **Step 5: Run tests and build**

Run separately:

```powershell
node --test test/repairHistoryLogic.test.mjs
npm.cmd run build
```

### Task 2: Compact functional history archive

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/styles.css`
- Test: `test/repairHistoryLogic.test.mjs`

**Interfaces:**
- Produces: `HistoryOrderTable` with eight fixed columns.
- Reuses: `OrderDetailDialog`, `WorkOrderFormDialog`, `ConfirmActionDialog`.
- Consumes: `onSaveArchivedOrder`, `onReverseSettlement`, receipt handlers, company, role, and refresh callback.

- [ ] **Step 1: Extend filter tests**

Add cases proving settlement date, plate, customer, phone, insurer, vehicle type, and staff filters compose correctly.

- [ ] **Step 2: Replace inert history controls**

Implement real Query, Reset, cloud Refresh, page-size selection, previous/next navigation, and page reset when filters change.

- [ ] **Step 3: Add the compact history table**

Render: order number, settlement time, vehicle, customer, repair content, amount, staff, and actions. Clamp repair content to two lines and avoid `.table-scroll` horizontal overflow on desktop.

- [ ] **Step 4: Keep history actions on the history page**

Row/View opens `OrderDetailDialog`; Print prints the selected archive; admin Edit opens `WorkOrderFormDialog` in archive mode; admin Return Settlement uses `ConfirmActionDialog` then moves the order to `待结算`.

- [ ] **Step 5: Enforce archive form restrictions in the UI**

Add `archiveMode` to `OrderForm` and `WorkOrderFormDialog`. In archive mode, status and payment controls are read-only and receipt/settlement fields are not part of the editor.

- [ ] **Step 6: Add responsive CSS**

Use fixed table layout and combined cells above 760px. Below 760px render each history row as a compact information block without horizontal scrolling.

### Task 3: Archive-edit API enforcement and event identifiers

**Files:**
- Create: `migrations/0008_business_event_logs.sql`
- Create: `functions/_shared/order-audit.js`
- Create: `test/orderAudit.test.mjs`
- Modify: `functions/_shared/auth.js`
- Modify: `functions/api/orders.js`
- Modify: `functions/api/receipts.js`
- Modify: `src/App.jsx`

**Interfaces:**
- Produces: `buildOrderAuditEvent(existing, next)` returning `{ action, summary, changes }` or `null` when nothing changed.
- Extends: `writeOperationLog(..., options)` with `eventId`, `summary`, and `changes`.
- Accepts: `{ order, mode, eventId }` in the order save endpoint.

- [ ] **Step 1: Write failing audit-diff tests**

```js
test('order edit describes changed business fields', () => {
  const event = buildOrderAuditEvent(
    { status: '已结算', plate: '蒙K12345', material: 500, staff: '王工' },
    { status: '已结算', plate: '蒙K12345', material: 680, staff: '张工' },
  );
  assert.equal(event.action, 'update_order');
  assert.match(event.summary, /材料费.*500.*680/);
  assert.match(event.summary, /业务员.*王工.*张工/);
});

test('unchanged saves create no audit event', () => {
  assert.equal(buildOrderAuditEvent({ status: '已结算' }, { status: '已结算' }), null);
});
```

- [ ] **Step 2: Add migration fields and uniqueness**

Add `event_id TEXT NOT NULL DEFAULT ''`, `summary TEXT NOT NULL DEFAULT ''`, and `changes TEXT NOT NULL DEFAULT ''` to `operation_logs`, plus a partial unique index for non-empty `event_id`.

- [ ] **Step 3: Implement field-level audit summaries**

Map business field keys to Chinese labels, classify create/update/status/settle/reverse actions, omit sensitive values, and return no event for no-op saves.

- [ ] **Step 4: Enforce archive mode on the server**

When `mode === 'archive_edit'`, require admin, require existing status `已结算`, and overwrite protected status/payment/settlement/receipt fields from the existing row before saving.

- [ ] **Step 5: Make event writes idempotent**

Use `INSERT OR IGNORE` when a non-empty `eventId` is provided. Preserve existing logging calls without event identifiers.

- [ ] **Step 6: Combine settlement receipt and order save**

Generate one `eventId` in `SettlementDialog`. Upload the initial receipt with `logMode: 'defer'`, then save the settled order with the same event identifier. Standalone receipt upload/delete remains a primary event.

- [ ] **Step 7: Add archive-save frontend path**

Send `mode: 'archive_edit'` and a new event identifier from history edits. Preserve protected fields locally before the optimistic update.

### Task 4: Beijing-time grouped operation log UI

**Files:**
- Create: `src/auditLogLogic.js`
- Create: `test/auditLogLogic.test.mjs`
- Modify: `functions/api/operation-logs.js`
- Modify: `src/App.jsx`
- Modify: `src/styles.css`

**Interfaces:**
- Produces: `formatAuditTime(createdAt)`, `groupAuditLogs(logs)`, and `auditActionLabel(action)`.
- Consumes: new event fields and legacy raw operation rows.

- [ ] **Step 1: Write failing timezone and grouping tests**

```js
test('D1 UTC timestamp displays in Shanghai time', () => {
  assert.equal(formatAuditTime('2026-07-11 02:30:00'), '2026-07-11 10:30:00');
});

test('legacy steps for one target collapse within five seconds', () => {
  const groups = groupAuditLogs([
    { id: 2, target_id: 'RO1', label: '管理员', action: 'settle_order', created_at: '2026-07-11 02:30:02' },
    { id: 1, target_id: 'RO1', label: '管理员', action: 'upload_receipt', created_at: '2026-07-11 02:30:00' },
  ]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].steps.length, 2);
});
```

- [ ] **Step 2: Return structured event fields from the API**

Select `event_id`, `summary`, and `changes` with the existing log columns.

- [ ] **Step 3: Implement UTC parsing and legacy grouping**

Treat D1 timestamps without a zone suffix as UTC, format with `Asia/Shanghai`, group new rows by `event_id`, and heuristically group old rows by actor + target within five seconds.

- [ ] **Step 4: Replace the raw log table**

Display Beijing time, operator, Chinese action, target, and summary. Add date, operator, action, and target filters. Each group expands to raw internal steps and field changes.

- [ ] **Step 5: Verify old and new log behavior**

Run: `node --test test/auditLogLogic.test.mjs test/orderAudit.test.mjs`

### Task 5: Full verification, migration, release, and handoff

**Files:**
- Modify only files required by verification findings.

- [ ] **Step 1: Run all tests**

Run: `node --test test/*.test.mjs`
Expected: all tests pass with zero failures.

- [ ] **Step 2: Run the production build and diff checks**

Run: `npm.cmd run build` and `git -c safe.directory=E:/codex/chengxu diff --check`.

- [ ] **Step 3: Apply the D1 migration remotely**

Run: `npx.cmd wrangler d1 migrations apply chengxu-db --remote` using the database name from `wrangler.jsonc`.

- [ ] **Step 4: Deploy Pages**

Run: `npx.cmd wrangler pages deploy dist --project-name chengxu --branch main`.

- [ ] **Step 5: Commit and push**

Commit message: `feat: separate repair archive and group audit events`, then push `main` through the configured proxy.

- [ ] **Step 6: Save the next handoff prompt**

Include the final commit, migration status, deployment URL, verified workflows, and any remaining browser-visual QA limitation.
