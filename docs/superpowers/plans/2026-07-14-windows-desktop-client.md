# Windows PC Client Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Package the existing automotive repair React application as a stable Windows 10/11 Tauri 2 client with cloud-only data, offline read-only behavior, native file interactions, signed update support, and a compact login-page client download dialog.

**Architecture:** Keep one React business UI and introduce a small platform adapter boundary under `src/platform/`. The web build continues to call same-origin Cloudflare Functions, while the packaged Tauri build maps `/api/*` to `https://chengxu.pages.dev`, uses narrowly scoped native plugins, and embeds its frontend assets so desktop releases remain independent from web releases.

**Tech Stack:** React 19, Vite 6, Node test runner, Cloudflare Pages Functions/D1, Tauri 2, Rust, Windows WebView2, NSIS, Tencent COS.

## Global Constraints

- Support Windows 10 and Windows 11 only; minimum application viewport is 1280x720.
- Use Tauri 2 and the Windows system WebView2 runtime; do not add Electron.
- Keep Cloudflare D1 and Tencent COS as the only cloud business stores.
- Do not add an offline database, mutation queue, conflict resolution, tray process, autostart, background daemon, or multi-window behavior.
- Web and desktop share React business code but publish independently; desktop assets are bundled into the installer.
- Desktop production API base is exactly `https://chengxu.pages.dev` and all production transport is HTTPS.
- When cloud health is unavailable, cached data is read-only and every business mutation is rejected by the API client.
- Do not embed COS credentials, Cloudflare credentials, account passwords, or the updater private key in frontend or Tauri source.
- The website download entry is a low-weight button at the bottom of the login panel and opens a modal; it is not a page or sidebar item.
- Use NSIS per-user installation, native Windows title bar, single-instance activation, and close-to-exit behavior.
- Keep all current administrator/staff server-side permission checks; desktop UI state never replaces backend authorization.
- After every task: run the listed checks, commit the scoped change, push `main`, and refresh the handoff prompt.

---

## File Map

**New frontend platform files**

- `src/platform/runtime.js`: identifies web versus Tauri and resolves API URLs.
- `src/platform/apiClient.js`: selects browser/Tauri fetch, enforces offline mutation blocking, and reports request outcomes.
- `src/platform/networkStore.js`: framework-neutral health state and subscriptions.
- `src/platform/useNetworkStatus.js`: React hook that runs health checks and exposes status.
- `src/platform/files.js`: web/Tauri file save and external-link adapters.
- `src/platform/updater.js`: normalized desktop version and updater operations.
- `src/updateLogic.js`: pure update progress transitions.
- `src/clientReleaseLogic.js`: release metadata normalization and display rules.
- `src/networkLogic.js`: pure network state transitions and mutation classification.
- `src/components/ClientDownloadsDialog.jsx`: login-page Windows/Android download modal.
- `src/components/NetworkStatusBar.jsx`: global offline/stale-data banner.
- `src/components/DesktopUpdatePanel.jsx`: settings modal and update progress UI.
- `src/cloudRecordLogic.js`: one-time local-to-cloud import candidate selection.
- `src/components/LegacyCloudImportDialog.jsx`: explicit administrator migration dialog for browser-local insurance/customer records.

**New Cloudflare files**

- `functions/api/health.js`: public no-cache cloud health response.
- `functions/_shared/releases.js`: release environment parsing and semantic-version comparison.
- `functions/api/client-releases.js`: public normalized Windows/Android release metadata.
- `functions/api/client-updates/[target]/[arch]/[currentVersion].js`: Tauri dynamic update endpoint.
- `functions/_shared/cloud-records.js`: JSON record validation, serialization, and row parsing.
- `functions/api/insurance-policies.js`: company-scoped insurance record list/upsert/import API.
- `functions/api/customer-vehicles.js`: company-scoped customer vehicle list/upsert/import API.
- `migrations/0009_cloud_insurance_and_customers.sql`: D1 tables for both record types.

**New Tauri files**

- `src-tauri/Cargo.toml`, `src-tauri/build.rs`, `src-tauri/src/main.rs`, `src-tauri/src/lib.rs`: desktop shell and plugins.
- `src-tauri/tauri.conf.json`: Windows window, bundle, updater, and build configuration.
- `src-tauri/capabilities/default.json`: narrow HTTP/dialog/fs/opener/updater/process permissions.
- `src-tauri/icons/*`: generated Windows application icons.

**Existing files to modify**

- `src/App.jsx`: replace raw cloud fetch calls, mount network/update/download UI, and route export/print through adapters.
- `src/styles.css`: style the offline banner, download modal, update panel, and desktop-disabled states.
- `package.json`, `package-lock.json`: Tauri/plugin dependencies and desktop scripts.
- `.gitignore`, `.env.example`, `DEPLOYMENT.md`: signing and release artifacts/configuration.

**New tests**

- `test/runtime.test.mjs`
- `test/apiClient.test.mjs`
- `test/networkLogic.test.mjs`
- `test/clientReleaseLogic.test.mjs`
- `test/releasesFunction.test.mjs`
- `test/cloudRecordLogic.test.mjs`
- `test/cloudRecords.test.mjs`
- `test/filesPlatform.test.mjs`
- `test/updateLogic.test.mjs`

---

### Task 1: Platform Runtime and API Client Boundary

**Files:**
- Create: `src/platform/runtime.js`
- Create: `src/platform/apiClient.js`
- Create: `test/runtime.test.mjs`
- Create: `test/apiClient.test.mjs`
- Modify: `src/App.jsx: API helper functions near authHeaders()`

**Interfaces:**
- Produces: `isTauriRuntime(windowLike?) -> boolean`
- Produces: `resolveApiUrl(path, options?) -> string`
- Produces: `setNetworkReporter(reporter) -> void`
- Produces: `setSessionExpiredReporter(reporter) -> void`
- Produces: `apiFetch(path, init?) -> Promise<Response>`
- Consumes later: `networkStore.reportSuccess()` and `networkStore.reportFailure(error)` registered through `setNetworkReporter`.

- [ ] **Step 1: Install the desktop HTTP bridge dependency**

Run: `npm.cmd install @tauri-apps/plugin-http`

Expected: `package.json` and `package-lock.json` add the Tauri HTTP plugin so Vite can resolve the desktop-only dynamic import during the shared web build.

- [ ] **Step 2: Write runtime URL tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { isTauriRuntime, resolveApiUrl } from '../src/platform/runtime.js';

test('detects a Tauri runtime without touching the real window', () => {
  assert.equal(isTauriRuntime({ __TAURI_INTERNALS__: {} }), true);
  assert.equal(isTauriRuntime({}), false);
});

test('web API paths remain same-origin', () => {
  assert.equal(resolveApiUrl('/api/orders', { desktop: false }), '/api/orders');
});

test('desktop API paths use the fixed production origin', () => {
  assert.equal(
    resolveApiUrl('/api/orders?status=open', { desktop: true }),
    'https://chengxu.pages.dev/api/orders?status=open',
  );
});
```

- [ ] **Step 3: Run the runtime test and verify it fails**

Run: `node --test test/runtime.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/platform/runtime.js`.

- [ ] **Step 4: Implement runtime detection and URL mapping**

```js
export const DESKTOP_API_ORIGIN = 'https://chengxu.pages.dev';

export function isTauriRuntime(windowLike = typeof window === 'undefined' ? undefined : window) {
  return Boolean(windowLike && '__TAURI_INTERNALS__' in windowLike);
}

export function resolveApiUrl(path, options = {}) {
  const desktop = options.desktop ?? isTauriRuntime();
  if (!desktop) return path;
  return new URL(path, DESKTOP_API_ORIGIN).toString();
}
```

- [ ] **Step 5: Write API client selection and offline-guard tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  NetworkUnavailableError,
  apiFetch,
  resetApiClientForTests,
  setApiClientFetchForTests,
  setNetworkReporter,
  setSessionExpiredReporter,
} from '../src/platform/apiClient.js';

test.afterEach(() => resetApiClientForTests());

test('GET uses the resolved API URL and reports success', async () => {
  const calls = [];
  const events = [];
  setApiClientFetchForTests(async (url, init) => {
    calls.push({ url, init });
    return new Response('{}', { status: 200 });
  });
  setNetworkReporter({ isOnline: () => true, success: () => events.push('success'), failure: () => {} });
  await apiFetch('/api/orders', {}, { desktop: true });
  assert.equal(calls[0].url, 'https://chengxu.pages.dev/api/orders');
  assert.deepEqual(events, ['success']);
});

test('offline mutation is rejected before fetch', async () => {
  let called = false;
  setApiClientFetchForTests(async () => { called = true; return new Response('{}'); });
  setNetworkReporter({ isOnline: () => false, success: () => {}, failure: () => {} });
  await assert.rejects(
    apiFetch('/api/orders', { method: 'POST' }, { desktop: true }),
    NetworkUnavailableError,
  );
  assert.equal(called, false);
});

test('authenticated 401 reports an expired session', async () => {
  let expired = false;
  setApiClientFetchForTests(async () => new Response('{}', { status: 401 }));
  setSessionExpiredReporter(() => { expired = true; });
  await apiFetch('/api/orders', { headers: { authorization: 'Bearer expired' } }, { desktop: false });
  assert.equal(expired, true);
});
```

- [ ] **Step 6: Run the API client test and verify it fails**

Run: `node --test test/apiClient.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/platform/apiClient.js`.

- [ ] **Step 7: Implement the API client**

```js
import { isTauriRuntime, resolveApiUrl } from './runtime.js';

export class NetworkUnavailableError extends Error {
  constructor(message = '网络不可用，请恢复连接后重试') {
    super(message);
    this.name = 'NetworkUnavailableError';
  }
}

let fetchOverride;
let reporter = { isOnline: () => true, success: () => {}, failure: () => {} };
let sessionExpiredReporter = () => {};

export function setNetworkReporter(nextReporter) {
  reporter = nextReporter;
}

export function setApiClientFetchForTests(nextFetch) {
  fetchOverride = nextFetch;
}

export function setSessionExpiredReporter(nextReporter) {
  sessionExpiredReporter = nextReporter;
}

export function resetApiClientForTests() {
  fetchOverride = undefined;
  reporter = { isOnline: () => true, success: () => {}, failure: () => {} };
  sessionExpiredReporter = () => {};
}

async function platformFetch(desktop) {
  if (fetchOverride) return fetchOverride;
  if (desktop) return (await import('@tauri-apps/plugin-http')).fetch;
  return window.fetch.bind(window);
}

export async function apiFetch(path, init = {}, options = {}) {
  const desktop = options.desktop ?? isTauriRuntime();
  const method = String(init.method || 'GET').toUpperCase();
  const isMutation = !['GET', 'HEAD', 'OPTIONS'].includes(method);
  if (isMutation && !reporter.isOnline()) throw new NetworkUnavailableError();
  try {
    const execute = await platformFetch(desktop);
    const response = await execute(resolveApiUrl(path, { desktop }), init);
    reporter.success();
    const headers = new Headers(init.headers || {});
    if (response.status === 401 && headers.has('authorization')) sessionExpiredReporter();
    return response;
  } catch (error) {
    reporter.failure(error);
    throw error instanceof NetworkUnavailableError ? error : new NetworkUnavailableError();
  }
}
```

- [ ] **Step 8: Replace direct cloud `fetch()` calls in App.jsx**

Add:

```js
import { apiFetch } from './platform/apiClient.js';
```

Replace every cloud helper call such as:

```js
const response = await fetch('/api/orders', { headers: authHeaders(session) });
```

with:

```js
const response = await apiFetch('/api/orders', { headers: authHeaders(session) });
```

Apply the same replacement to access, orders, void, logs, access-code, accounts, dictionaries, and all receipt GET/POST/DELETE requests. Do not replace Blob object URLs or other non-API browser operations.

Register `setSessionExpiredReporter(logout)` from an App effect after `logout` is available, and remove the listener during cleanup. An authenticated 401 must clear the session and return to the login screen; an invalid login response without an Authorization header must continue to show the normal login error.

- [ ] **Step 9: Run focused and full web checks**

Run: `node --test test/runtime.test.mjs test/apiClient.test.mjs`

Expected: PASS.

Run: `node --test test/*.test.mjs`

Expected: all tests PASS.

Run: `npm.cmd run build`

Expected: Vite production build succeeds.

- [ ] **Step 10: Commit and push**

```powershell
git add package.json package-lock.json src/platform/runtime.js src/platform/apiClient.js src/App.jsx test/runtime.test.mjs test/apiClient.test.mjs
git commit -m "refactor: add shared platform API client"
git push origin main
```

---

### Task 2: Move Insurance and Customer Vehicles to D1

**Files:**
- Create: `migrations/0009_cloud_insurance_and_customers.sql`
- Create: `functions/_shared/cloud-records.js`
- Create: `functions/api/insurance-policies.js`
- Create: `functions/api/customer-vehicles.js`
- Create: `src/cloudRecordLogic.js`
- Create: `src/components/LegacyCloudImportDialog.jsx`
- Create: `test/cloudRecordLogic.test.mjs`
- Create: `test/cloudRecords.test.mjs`
- Modify: `src/App.jsx: insurance/customer storage readers, login loading, save handlers, work-order synchronization`
- Modify: `src/styles.css: legacy import dialog status rows`

**Interfaces:**
- Consumes: `apiFetch()` from Task 1 and existing Bearer session headers.
- Produces: `fetchCloudInsurancePolicies(session) -> Promise<Policy[]>`
- Produces: `saveCloudInsurancePolicy(policy, session) -> Promise<Policy>`
- Produces: `fetchCloudCustomerVehicles(session) -> Promise<Vehicle[]>`
- Produces: `saveCloudCustomerVehicle(vehicle, session) -> Promise<Vehicle>`
- Produces: `findLegacyImportCandidates(localRecords, cloudRecords, companyId) -> Record[]`
- Produces: administrator-only bulk import actions that never overwrite a D1 record with the same company and ID.

- [ ] **Step 1: Write import-candidate tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { findLegacyImportCandidates } from '../src/cloudRecordLogic.js';

test('legacy import includes only the current company and skips cloud IDs', () => {
  const local = [
    { id: 'IP1', companyId: 'tongda', plate: '蒙A-1' },
    { id: 'IP2', companyId: 'xinqiheng', plate: '蒙A-2' },
    { id: 'IP3', companyId: 'tongda', plate: '蒙A-3' },
  ];
  const cloud = [{ id: 'IP3', companyId: 'tongda', plate: '云端记录' }];
  assert.deepEqual(
    findLegacyImportCandidates(local, cloud, 'tongda').map((record) => record.id),
    ['IP1'],
  );
});
```

- [ ] **Step 2: Run and verify failure**

Run: `node --test test/cloudRecordLogic.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement candidate selection**

```js
export function findLegacyImportCandidates(localRecords, cloudRecords, companyId) {
  const cloudIds = new Set(cloudRecords.map((record) => record.id));
  return localRecords.filter((record) => (
    record
    && record.id
    && (record.companyId || 'tongda') === companyId
    && !cloudIds.has(record.id)
  ));
}
```

- [ ] **Step 4: Add D1 tables**

```sql
CREATE TABLE IF NOT EXISTS insurance_policies (
  company_id TEXT NOT NULL,
  id TEXT NOT NULL,
  record_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (company_id, id)
);

CREATE TABLE IF NOT EXISTS customer_vehicles (
  company_id TEXT NOT NULL,
  id TEXT NOT NULL,
  record_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (company_id, id)
);

CREATE INDEX IF NOT EXISTS idx_insurance_policies_company_updated
  ON insurance_policies(company_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_vehicles_company_updated
  ON customer_vehicles(company_id, updated_at DESC);
```

- [ ] **Step 5: Write cloud-record helper tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCloudRecord, parseCloudRows } from '../functions/_shared/cloud-records.js';

test('server forces the authenticated company onto stored JSON', () => {
  assert.deepEqual(normalizeCloudRecord({ id: 'IP1', companyId: 'wrong', plate: '蒙A-1' }, 'tongda'), {
    id: 'IP1', companyId: 'tongda', plate: '蒙A-1',
  });
});

test('invalid JSON rows are ignored without breaking the full list', () => {
  assert.deepEqual(parseCloudRows([
    { record_json: '{"id":"IP1"}' },
    { record_json: '{broken' },
  ]), [{ id: 'IP1' }]);
});
```

- [ ] **Step 6: Implement cloud-record helpers**

```js
export function normalizeCloudRecord(record, companyId) {
  if (!record || typeof record !== 'object' || !String(record.id || '').trim()) {
    throw new Error('RECORD_ID_REQUIRED');
  }
  return { ...record, id: String(record.id).trim(), companyId };
}

export function parseCloudRows(rows = []) {
  return rows.flatMap((row) => {
    try { return [JSON.parse(row.record_json)]; } catch { return []; }
  });
}
```

- [ ] **Step 7: Implement company-scoped APIs**

Both endpoints must use `requireSession(request, env, { permission: 'insurance' })` or `{ permission: 'customers' }`, force `session.company_id`, and never trust a frontend company ID.

GET behavior:

```js
const result = await env.DB.prepare(
  'SELECT record_json FROM insurance_policies WHERE company_id = ? ORDER BY updated_at DESC',
).bind(session.company_id).all();
return json({ policies: parseCloudRows(result.results) });
```

POST single-record behavior uses `INSERT ... ON CONFLICT(company_id, id) DO UPDATE` and returns the normalized record. POST `{ action: 'import', records }` requires `session.role === 'admin'`, caps input at 1000 records, and uses `INSERT OR IGNORE` so an old local record cannot overwrite cloud data. The customer endpoint follows the same explicit SQL with its own table and returns `{ vehicles }`.

- [ ] **Step 8: Add API helpers to App.jsx**

Add list/save/import helpers for both endpoints using `apiFetch` and `authHeaders`. On authenticated startup, fetch orders, insurance, vehicles, and dictionaries. Only replace React state after each successful cloud response; keep the last cache when a read fails.

- [ ] **Step 9: Remove bundled fake insurance and customer records**

Delete `insuranceRows` and `customerVehicleRows`. Change both storage readers to return `[]` when no valid cache exists. Before the first cloud replacement, copy any existing non-empty browser records to company-specific backup keys:

```js
chengxu-legacy-insurance-backup-<companyId>
chengxu-legacy-customers-backup-<companyId>
```

Do not delete those backup keys until a successful administrator import.

- [ ] **Step 10: Add explicit legacy import dialog**

After cloud data loads, compare backup records with D1 using `findLegacyImportCandidates`. For an administrator with candidates, show one dialog summarizing insurance/customer counts. `导入云端` calls both bulk import APIs, refreshes both cloud lists, then removes the backup keys. `暂不导入` closes the dialog for the current run but retains backup data. Staff never receive the import action.

- [ ] **Step 11: Make normal saves cloud-first**

Convert `upsertOrder` to return `saveCloudOrder(...)` and update React/local cache only after the cloud response succeeds. Convert `saveInsurancePolicy` and `saveCustomerVehicle` to call their cloud save helpers and update state only after success. Convert `syncCustomerVehicleFromOrder` and `syncInsurancePolicyFromOrder` to return promises and persist their normalized records through the same APIs. `saveOrder` first awaits the work-order save, then runs archive synchronization with `Promise.allSettled`, surfacing a visible warning when an archive save fails without duplicating or prematurely displaying the work order.

- [ ] **Step 12: Run tests and builds**

Run: `node --test test/cloudRecordLogic.test.mjs test/cloudRecords.test.mjs`

Expected: PASS.

Run: `node --check functions/api/insurance-policies.js`

Expected: exit 0.

Run: `node --check functions/api/customer-vehicles.js`

Expected: exit 0.

Run: `node --test test/*.test.mjs`

Expected: all tests PASS.

Run: `npm.cmd run build`

Expected: PASS.

- [ ] **Step 13: Apply the remote D1 migration**

Run:

```powershell
npx.cmd wrangler d1 migrations apply chengxu-db --remote
```

Expected: migration `0009_cloud_insurance_and_customers.sql` reports applied. Query both tables and confirm they exist before deploying the frontend that calls the new APIs.

- [ ] **Step 14: Commit and push**

```powershell
git add migrations/0009_cloud_insurance_and_customers.sql functions/_shared/cloud-records.js functions/api/insurance-policies.js functions/api/customer-vehicles.js src/cloudRecordLogic.js src/components/LegacyCloudImportDialog.jsx src/App.jsx src/styles.css test/cloudRecordLogic.test.mjs test/cloudRecords.test.mjs
git commit -m "feat: move insurance and customer records to D1"
git push origin main
```

---

### Task 3: Cloud Health, Network State, and Read-Only Mode

**Files:**
- Create: `functions/api/health.js`
- Create: `src/networkLogic.js`
- Create: `src/platform/networkStore.js`
- Create: `src/platform/useNetworkStatus.js`
- Create: `src/components/NetworkStatusBar.jsx`
- Create: `test/networkLogic.test.mjs`
- Modify: `src/App.jsx: App state, root shell, mutation handlers`
- Modify: `src/styles.css: global status banner and offline states`

**Interfaces:**
- Consumes: `apiFetch(path, init, options)` and `setNetworkReporter(reporter)` from Task 1.
- Produces: `createNetworkState(status, lastSyncedAt?)`
- Produces: `reduceNetworkState(state, event)`
- Produces: `networkStore.getSnapshot()/subscribe()/reportSuccess()/reportFailure()/setChecking()`
- Produces: `useNetworkStatus() -> { status, isOnline, lastSyncedAt, checkNow }`

- [ ] **Step 1: Write network state-machine tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createNetworkState, reduceNetworkState } from '../src/networkLogic.js';

test('a successful health check records online and sync time', () => {
  const result = reduceNetworkState(createNetworkState(), { type: 'success', at: '2026-07-14T01:00:00.000Z' });
  assert.deepEqual(result, { status: 'online', lastSyncedAt: '2026-07-14T01:00:00.000Z' });
});

test('a request failure enters offline without losing the previous sync time', () => {
  const current = { status: 'online', lastSyncedAt: '2026-07-14T01:00:00.000Z' };
  assert.deepEqual(reduceNetworkState(current, { type: 'failure' }), {
    status: 'offline',
    lastSyncedAt: '2026-07-14T01:00:00.000Z',
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `node --test test/networkLogic.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement pure network transitions**

```js
export function createNetworkState(status = 'checking', lastSyncedAt = '') {
  return { status, lastSyncedAt };
}

export function reduceNetworkState(state, event) {
  if (event.type === 'checking') return { ...state, status: 'checking' };
  if (event.type === 'success') return { status: 'online', lastSyncedAt: event.at };
  if (event.type === 'failure') return { ...state, status: 'offline' };
  return state;
}
```

- [ ] **Step 4: Add the public health Function**

```js
export async function onRequestGet() {
  return new Response(JSON.stringify({ ok: true, service: 'chengxu', time: new Date().toISOString() }), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}
```

- [ ] **Step 5: Implement the external network store and hook**

`networkStore.js` must keep one state object, notify subscribers after transitions, and register itself with `setNetworkReporter`:

```js
import { reduceNetworkState, createNetworkState } from '../networkLogic.js';
import { setNetworkReporter } from './apiClient.js';

let state = createNetworkState();
const listeners = new Set();

function update(event) {
  state = reduceNetworkState(state, event);
  listeners.forEach((listener) => listener());
}

export const networkStore = {
  getSnapshot: () => state,
  subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  reportSuccess() { update({ type: 'success', at: new Date().toISOString() }); },
  reportFailure() { update({ type: 'failure' }); },
  setChecking() { update({ type: 'checking' }); },
};

setNetworkReporter({
  isOnline: () => networkStore.getSnapshot().status !== 'offline',
  success: () => networkStore.reportSuccess(),
  failure: () => networkStore.reportFailure(),
});
```

`useNetworkStatus.js` uses `useSyncExternalStore`, calls `apiFetch('/api/health')` on mount, on browser `online` events, and every 30 seconds while offline. `checkNow()` must set checking, perform the health GET, and return a boolean.

- [ ] **Step 6: Add the banner component**

```jsx
export default function NetworkStatusBar({ status, lastSyncedAt, onRetry }) {
  if (status !== 'offline') return null;
  const syncedText = lastSyncedAt
    ? `上次同步：${new Date(lastSyncedAt).toLocaleString('zh-CN', { hour12: false })}`
    : '尚无可用同步记录';
  return (
    <div className="network-status-bar" role="status">
      <div><strong>网络不可用</strong><span>当前内容为上次同步结果 · {syncedText}</span></div>
      <button type="button" onClick={onRetry}>重新连接</button>
    </div>
  );
}
```

- [ ] **Step 7: Mount read-only state in App.jsx**

Call `useNetworkStatus()` at the top of `App`, render `NetworkStatusBar` above the app content, and derive:

```js
const network = useNetworkStatus();
const cloudReadOnly = !network.isOnline;
const requireOnline = { disabled: cloudReadOnly, title: cloudReadOnly ? '网络不可用，暂时不能执行此操作' : undefined };
```

Pass `cloudReadOnly` to Repair Reception, History, Insurance, Customers, Export, and Settings. Apply `requireOnline` to create/save/settle/reverse/void/upload/delete/export buttons. Keep navigation, searching, filtering, viewing, and printing enabled. Leave the `apiFetch` mutation guard as the final enforcement layer.

- [ ] **Step 8: Add styles**

```css
.network-status-bar {
  position: sticky;
  top: 0;
  z-index: 120;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 46px;
  padding: 8px 20px;
  color: #7f1d1d;
  background: #fff1f2;
  border-bottom: 1px solid #fecdd3;
}
.network-status-bar div { display: flex; align-items: baseline; gap: 10px; }
.network-status-bar span { font-size: 13px; color: #9f3a44; }
.network-status-bar button { border: 1px solid #fda4af; border-radius: 6px; padding: 6px 12px; color: #9f1239; background: #fff; }
button:disabled, [aria-disabled="true"] { cursor: not-allowed; opacity: .55; }
```

- [ ] **Step 9: Run checks**

Run: `node --test test/networkLogic.test.mjs test/apiClient.test.mjs`

Expected: PASS.

Run: `node --check functions/api/health.js`

Expected: no output and exit code 0.

Run: `npm.cmd run build`

Expected: PASS.

- [ ] **Step 10: Commit and push**

```powershell
git add functions/api/health.js src/networkLogic.js src/platform/networkStore.js src/platform/useNetworkStatus.js src/components/NetworkStatusBar.jsx src/App.jsx src/styles.css test/networkLogic.test.mjs
git commit -m "feat: add cloud network read-only mode"
git push origin main
```

---

### Task 4: Public Release Metadata and Login Download Dialog

**Files:**
- Create: `functions/_shared/releases.js`
- Create: `functions/api/client-releases.js`
- Create: `functions/api/client-updates/[target]/[arch]/[currentVersion].js`
- Create: `src/clientReleaseLogic.js`
- Create: `src/components/ClientDownloadsDialog.jsx`
- Create: `test/clientReleaseLogic.test.mjs`
- Create: `test/releasesFunction.test.mjs`
- Modify: `src/App.jsx: AccessGate`
- Modify: `src/styles.css: access footer and modal`
- Modify: `.env.example: public release variables`

**Interfaces:**
- Produces: `compareVersions(left, right) -> -1|0|1`
- Produces: `releaseConfig(env) -> { windows, android }`
- Produces: `normalizeClientReleases(payload) -> release view model`
- Consumes: `apiFetch('/api/client-releases')` from Task 1.

- [ ] **Step 1: Write release comparison and view-model tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeClientReleases } from '../src/clientReleaseLogic.js';
import { compareVersions } from '../functions/_shared/releases.js';

test('semantic versions compare numerically', () => {
  assert.equal(compareVersions('1.10.0', '1.9.9'), 1);
  assert.equal(compareVersions('1.0.0', '1.0.0'), 0);
});

test('unpublished Android renders as coming soon', () => {
  const result = normalizeClientReleases({ windows: { available: true, version: '1.0.0' }, android: { available: false } });
  assert.equal(result.android.actionLabel, '敬请期待');
  assert.equal(result.android.canDownload, false);
});
```

- [ ] **Step 2: Run and verify failure**

Run: `node --test test/clientReleaseLogic.test.mjs`

Expected: FAIL with missing modules.

- [ ] **Step 3: Implement shared release parsing**

```js
export function compareVersions(left, right) {
  const a = String(left || '').split('.').map((part) => Number(part) || 0);
  const b = String(right || '').split('.').map((part) => Number(part) || 0);
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    if ((a[index] || 0) > (b[index] || 0)) return 1;
    if ((a[index] || 0) < (b[index] || 0)) return -1;
  }
  return 0;
}

function platformConfig(env, prefix) {
  const version = String(env[`${prefix}_RELEASE_VERSION`] || '').trim();
  const downloadUrl = String(env[`${prefix}_RELEASE_DOWNLOAD_URL`] || '').trim();
  return {
    available: Boolean(version && downloadUrl),
    version,
    publishedAt: String(env[`${prefix}_RELEASE_PUBLISHED_AT`] || ''),
    size: String(env[`${prefix}_RELEASE_SIZE`] || ''),
    notes: String(env[`${prefix}_RELEASE_NOTES`] || ''),
    downloadUrl,
    updateUrl: String(env[`${prefix}_RELEASE_UPDATE_URL`] || downloadUrl),
    signature: String(env[`${prefix}_RELEASE_SIGNATURE`] || ''),
  };
}

export function releaseConfig(env) {
  return { windows: platformConfig(env, 'DESKTOP'), android: platformConfig(env, 'ANDROID') };
}
```

- [ ] **Step 4: Implement public metadata and updater endpoints**

`client-releases.js` returns `releaseConfig(env)` with `cache-control: public, max-age=300`.

The updater endpoint must:

```js
import { compareVersions, releaseConfig } from '../../../../_shared/releases.js';

export async function onRequestGet({ env, params }) {
  const release = releaseConfig(env).windows;
  const supported = params.target === 'windows' && params.arch === 'x86_64';
  const isNewer = compareVersions(release.version, params.currentVersion) > 0;
  if (!supported || !release.available || !release.signature || !isNewer) return new Response(null, { status: 204 });
  return Response.json({
    version: release.version,
    pub_date: release.publishedAt,
    url: release.updateUrl,
    signature: release.signature,
    notes: release.notes,
  }, { headers: { 'cache-control': 'no-store' } });
}
```

- [ ] **Step 5: Write endpoint tests with explicit environment data**

Test `client-releases` returns `available: true` for Windows when version and download URL exist. Test updater returns 204 for `1.0.0` requesting `1.0.0`, 204 for unsupported arch, and 200 with version/signature for `0.9.0`.

- [ ] **Step 6: Implement frontend normalization**

```js
export function normalizeClientReleases(payload = {}) {
  function normalize(item = {}, platform) {
    const available = Boolean(item.available && item.downloadUrl);
    return {
      platform,
      available,
      version: item.version || '',
      publishedAt: item.publishedAt || '',
      size: item.size || '',
      notes: item.notes || '',
      downloadUrl: item.downloadUrl || '',
      canDownload: available,
      actionLabel: available ? '立即下载' : '敬请期待',
    };
  }
  return { windows: normalize(payload.windows, 'Windows'), android: normalize(payload.android, 'Android') };
}
```

- [ ] **Step 7: Build ClientDownloadsDialog**

The component accepts `{ open, onClose }`, fetches metadata only when opened, presents two non-nested cards, and opens `downloadUrl` through the platform external-link adapter added in Task 6. Before Task 6 exists, consume a temporary injected `onDownload(url)` prop from `AccessGate`; Task 6 removes that temporary prop and calls `openExternal(url)` directly.

- [ ] **Step 8: Mount a compact login footer**

Add local `downloadsOpen` state to `AccessGate`, render:

```jsx
<button type="button" className="access-download-link" onClick={() => setDownloadsOpen(true)}>
  客户端下载
</button>
<ClientDownloadsDialog open={downloadsOpen} onClose={() => setDownloadsOpen(false)} />
```

Place it after the login form inside `access-panel`; it must not appear in the app sidebar.

- [ ] **Step 9: Add release variables to .env.example**

```text
DESKTOP_RELEASE_VERSION=
DESKTOP_RELEASE_PUBLISHED_AT=
DESKTOP_RELEASE_SIZE=
DESKTOP_RELEASE_NOTES=
DESKTOP_RELEASE_DOWNLOAD_URL=
DESKTOP_RELEASE_UPDATE_URL=
DESKTOP_RELEASE_SIGNATURE=
ANDROID_RELEASE_VERSION=
ANDROID_RELEASE_PUBLISHED_AT=
ANDROID_RELEASE_SIZE=
ANDROID_RELEASE_NOTES=
ANDROID_RELEASE_DOWNLOAD_URL=
```

- [ ] **Step 10: Run tests and build**

Run: `node --test test/clientReleaseLogic.test.mjs test/releasesFunction.test.mjs`

Expected: PASS.

Run: `node --check functions/api/client-releases.js`

Expected: exit 0.

Run: `npm.cmd run build`

Expected: PASS.

- [ ] **Step 11: Commit and push**

```powershell
git add functions/_shared/releases.js functions/api/client-releases.js functions/api/client-updates src/clientReleaseLogic.js src/components/ClientDownloadsDialog.jsx src/App.jsx src/styles.css test/clientReleaseLogic.test.mjs test/releasesFunction.test.mjs .env.example
git commit -m "feat: add client release download dialog"
git push origin main
```

---

### Task 5: Tauri 2 Windows Shell

**Files:**
- Create: `src-tauri/Cargo.toml`
- Create: `src-tauri/build.rs`
- Create: `src-tauri/src/main.rs`
- Create: `src-tauri/src/lib.rs`
- Create: `src-tauri/tauri.conf.json`
- Create: `src-tauri/capabilities/default.json`
- Create: `src-tauri/icons/*`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: Vite `dist` output and `https://chengxu.pages.dev/api/*`.
- Produces: `npm run desktop:dev`, `npm run desktop:check`, and `npm run desktop:build`.
- Produces: a single-instance Windows app named `汽修接待与车辆保险管理`.

- [ ] **Step 1: Install Tauri dependencies**

Run:

```powershell
npm.cmd install @tauri-apps/api @tauri-apps/plugin-dialog @tauri-apps/plugin-fs @tauri-apps/plugin-opener @tauri-apps/plugin-process @tauri-apps/plugin-updater
npm.cmd install --save-dev @tauri-apps/cli
```

Expected: package files update successfully.

- [ ] **Step 2: Add package scripts**

```json
{
  "scripts": {
    "desktop:dev": "tauri dev",
    "desktop:check": "cargo check --manifest-path src-tauri/Cargo.toml",
    "desktop:build": "tauri build --bundles nsis"
  }
}
```

Preserve every existing script.

- [ ] **Step 3: Create Rust package and shell**

`Cargo.toml` uses Tauri 2 and these plugins: http, dialog, fs, opener, process, updater, single-instance, window-state. `lib.rs` registers each plugin. The single-instance callback must unminimize, show, and focus the `main` window.

Core callback:

```rust
use tauri::Manager;

tauri_plugin_single_instance::init(|app, _args, _cwd| {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
})
```

- [ ] **Step 4: Configure the Windows window and bundle**

Use product name `汽修接待与车辆保险管理`, identifier `com.chengxu.repairmanager`, frontend dist `../dist`, dev URL `http://localhost:5173`, width 1440, height 900, min width 1280, min height 720, native decorations, and `maximized: true`. Configure NSIS per-user install and updater endpoint:

```json
"bundle": {
  "active": true,
  "targets": ["nsis"],
  "windows": {
    "webviewInstallMode": { "type": "downloadBootstrapper" },
    "nsis": { "installMode": "currentUser" }
  }
},
"plugins": {
  "updater": {
    "endpoints": [
      "https://chengxu.pages.dev/api/client-updates/{{target}}/{{arch}}/{{current_version}}"
    ]
  }
}
```

The updater endpoint portion is exactly:

```json
"endpoints": [
  "https://chengxu.pages.dev/api/client-updates/{{target}}/{{arch}}/{{current_version}}"
]
```

The updater `pubkey` is the actual public key printed in Task 8 Step 1; until then leave updater plugin initialization present but `createUpdaterArtifacts` false so development builds work without a private key. Task 8 performs the one-time key insertion and enables artifacts.

- [ ] **Step 5: Create narrow capabilities**

Allow HTTP only for `https://chengxu.pages.dev/**`. Allow save/open dialogs, writes only to paths selected by a dialog, opener URLs, updater check/download/install, process relaunch, and window-state persistence. Do not grant shell permissions or broad filesystem scopes.

- [ ] **Step 6: Generate app icons from the existing neutral car artwork**

Run:

```powershell
npm.cmd run tauri icon public/assets/ui/icons/metric-car.png
```

Expected: Windows `.ico` and required PNG sizes appear in `src-tauri/icons`.

- [ ] **Step 7: Ignore local desktop secrets and artifacts**

Add:

```gitignore
src-tauri/target/
.tauri/
*.key
*.key.pub
```

Keep generated source/configuration and public icons tracked.

- [ ] **Step 8: Verify Rust and Windows build prerequisites**

Run: `rustc --version`, `cargo --version`, and `npm.cmd run desktop:check`.

Expected: Rust versions print and `cargo check` succeeds. If Rust or Microsoft C++ Build Tools are absent, install the official Tauri Windows prerequisites before retrying; do not switch frameworks.

- [ ] **Step 9: Build the first unsigned development installer**

Run: `npm.cmd run desktop:build`

Expected: an NSIS `.exe` appears below `src-tauri/target/release/bundle/nsis/` and is ignored by Git.

- [ ] **Step 10: Commit and push**

```powershell
git add package.json package-lock.json .gitignore src-tauri
git commit -m "feat: add Tauri Windows application shell"
git push origin main
```

---

### Task 6: Native Save, External Links, File Selection, and Printing

**Files:**
- Create: `src/platform/files.js`
- Create: `test/filesPlatform.test.mjs`
- Modify: `src/App.jsx: downloadExcel(), receipt inputs, print handlers`
- Modify: `src/components/ClientDownloadsDialog.jsx`

**Interfaces:**
- Produces: `saveBytes({ suggestedName, bytes, filters }) -> Promise<{ saved: boolean, path?: string }>`
- Produces: `openExternal(url) -> Promise<void>`
- Produces: `printCurrentDocument() -> Promise<void>`
- Consumes: `isTauriRuntime()`.

- [ ] **Step 1: Write web adapter tests**

Use injected browser primitives to assert that web save creates an object URL and clicks an anchor, canceled desktop save returns `{ saved: false }`, and `openExternal` rejects non-HTTPS URLs.

- [ ] **Step 2: Run the test and verify it fails**

Run: `node --test test/filesPlatform.test.mjs`

Expected: missing module failure.

- [ ] **Step 3: Implement platform file operations**

Desktop save flow:

```js
const [{ save }, { writeFile }] = await Promise.all([
  import('@tauri-apps/plugin-dialog'),
  import('@tauri-apps/plugin-fs'),
]);
const path = await save({ defaultPath: suggestedName, filters });
if (!path) return { saved: false };
await writeFile(path, bytes);
return { saved: true, path };
```

Web save keeps the existing object URL behavior. `openExternal` validates `new URL(url).protocol === 'https:'`; desktop uses `@tauri-apps/plugin-opener`, web uses `window.open(url, '_blank', 'noopener,noreferrer')`. Printing waits for the print template render, calls `window.print()`, and resolves without changing business state.

- [ ] **Step 4: Route Excel export through saveBytes**

Change `downloadExcel` to async:

```js
async function downloadExcel(filename, htmlContent) {
  const blob = new Blob(['\uFEFF' + htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const bytes = new Uint8Array(await blob.arrayBuffer());
  return saveBytes({
    suggestedName: filename,
    bytes,
    filters: [{ name: 'Excel 工作簿', extensions: ['xls'] }],
  });
}
```

Await this function in export actions and display an error banner if saving throws.

- [ ] **Step 5: Keep receipt selection native-compatible**

Retain `<input type="file" accept="image/jpeg,image/png,image/webp">` because WebView2 opens the Windows chooser natively. Do not request broad filesystem permission; the selected `File` continues through `FormData` and `apiFetch`.

- [ ] **Step 6: Route print and download links through adapters**

Replace both `window.print()` calls with `printCurrentDocument()`. Replace the temporary download callback from Task 4 with `openExternal(release.downloadUrl)` inside `ClientDownloadsDialog`.

- [ ] **Step 7: Run tests and builds**

Run: `node --test test/filesPlatform.test.mjs test/*.test.mjs`

Expected: all PASS.

Run: `npm.cmd run build`

Expected: PASS.

Run: `npm.cmd run desktop:check`

Expected: PASS.

- [ ] **Step 8: Commit and push**

```powershell
git add src/platform/files.js src/App.jsx src/components/ClientDownloadsDialog.jsx test/filesPlatform.test.mjs
git commit -m "feat: add native Windows file interactions"
git push origin main
```

---

### Task 7: Desktop Update State and Settings UI

**Files:**
- Create: `src/platform/updater.js`
- Create: `src/updateLogic.js`
- Create: `src/components/DesktopUpdatePanel.jsx`
- Create: `src/components/DesktopUpdatePrompt.jsx`
- Create: `test/updateLogic.test.mjs`
- Modify: `src/App.jsx: App update state and SystemSettingsPage launcher/modal`
- Modify: `src/styles.css: updater panel and prompt`

**Interfaces:**
- Produces: `normalizeUpdateEvent(event, currentProgress) -> progress state`
- Produces: `getDesktopVersion() -> Promise<string>`
- Produces: `checkForDesktopUpdate() -> Promise<Update|null>`
- Produces: `installDesktopUpdate(update, onProgress) -> Promise<void>`
- Produces: `relaunchDesktopApp() -> Promise<void>`

- [ ] **Step 1: Write update logic tests**

Test `Started` resets downloaded bytes, `Progress` accumulates chunk lengths, `Finished` sets complete, and web runtime reports updater unsupported without importing a Tauri plugin.

- [ ] **Step 2: Run and verify failure**

Run: `node --test test/updateLogic.test.mjs`

Expected: missing module failure.

- [ ] **Step 3: Implement update normalization and platform adapter**

`updater.js` must dynamically import `@tauri-apps/api/app`, `@tauri-apps/plugin-updater`, and `@tauri-apps/plugin-process` only when `isTauriRuntime()` is true. The web build returns an empty version and `null` update.

Download callback handling:

```js
await update.downloadAndInstall((event) => {
  progress = normalizeUpdateEvent(event, progress);
  onProgress(progress);
});
```

Do not relaunch automatically after download; enable a separate `更新并重启` action.

- [ ] **Step 4: Add app-level startup check**

At App initialization, check once when running in Tauri. Store `{ checking, update, error, progress, installed }`. Record a successful or failed automatic check time in `localStorage` under `chengxu-desktop-update-checked-at`. While the application remains open, run a lightweight hourly timer but call the update endpoint only when at least 24 hours have elapsed since that timestamp. Manual checks ignore the timestamp. Do not show a modal when no update exists. Do not block login or business use when checking fails.

- [ ] **Step 5: Add compact update prompt**

When a newer version exists, show one non-blocking dialog with version and notes. Actions are `稍后` and `下载更新`. Closing it suppresses the prompt for the current run but keeps the update available in Settings.

- [ ] **Step 6: Add About & Update settings launcher**

Add a fourth launcher card in `SystemSettingsPage`:

```jsx
<button type="button" className="settings-launcher-card blue" onClick={() => openSettingsModal('about')}>
  <span className="settings-launcher-icon">版</span>
  <div><strong>关于与更新</strong><p>查看客户端版本并检查更新</p></div>
  <b>→</b>
</button>
```

The modal shows current version, latest status, notes, progress, `检查更新`, `下载更新`, and `更新并重启`. In the web build it says `当前为网页版本` and hides updater actions.

- [ ] **Step 7: Run checks**

Run: `node --test test/updateLogic.test.mjs`

Expected: PASS.

Run: `npm.cmd run build`

Expected: PASS.

Run: `npm.cmd run desktop:check`

Expected: PASS.

- [ ] **Step 8: Commit and push**

```powershell
git add src/platform/updater.js src/updateLogic.js src/components/DesktopUpdatePanel.jsx src/components/DesktopUpdatePrompt.jsx src/App.jsx src/styles.css test/updateLogic.test.mjs
git commit -m "feat: add desktop update experience"
git push origin main
```

---

### Task 8: Signed Updater Artifacts and Release Configuration

**Files:**
- Modify: `src-tauri/tauri.conf.json`
- Modify: `.gitignore`
- Modify: `.env.example`
- Modify: `DEPLOYMENT.md`
- Create: `docs/windows-release-checklist.md`

**Interfaces:**
- Consumes: Tauri updater endpoint from Task 4 and Windows shell from Task 5.
- Produces: signed NSIS updater artifacts and an exact release checklist.

- [ ] **Step 1: Generate the updater signing key once**

Run:

```powershell
New-Item -ItemType Directory -Force -Path .tauri | Out-Null
npm.cmd run tauri signer generate -- -w .tauri/chengxu-updater.key
```

Expected: a private key under ignored `.tauri/` and a printed public key. Back up the private key outside the repository before publishing any installer.

- [ ] **Step 2: Enable updater artifacts with the generated public key**

Set `bundle.createUpdaterArtifacts` to `true` and set `plugins.updater.pubkey` to the exact public key printed by Step 1. Never commit the private key or password.

- [ ] **Step 3: Document required build environment**

Add:

```text
TAURI_SIGNING_PRIVATE_KEY=
TAURI_SIGNING_PRIVATE_KEY_PASSWORD=
DESKTOP_RELEASE_VERSION=
DESKTOP_RELEASE_PUBLISHED_AT=
DESKTOP_RELEASE_SIZE=
DESKTOP_RELEASE_NOTES=
DESKTOP_RELEASE_DOWNLOAD_URL=
DESKTOP_RELEASE_UPDATE_URL=
DESKTOP_RELEASE_SIGNATURE=
```

The `.env.example` values remain empty; real values are Cloudflare variables or local process environment values and are never committed.

- [ ] **Step 4: Build signed artifacts**

In the same PowerShell process, set `TAURI_SIGNING_PRIVATE_KEY` to the private key path/content and its password, then run:

```powershell
npm.cmd run desktop:build
```

Expected: NSIS installer and `.sig` updater signature below `src-tauri/target/release/bundle/nsis/`.

- [ ] **Step 5: Write the release checklist**

The checklist must require:

1. version bump in `src-tauri/tauri.conf.json`;
2. full Node tests, Vite build, cargo check, and NSIS build;
3. clean-install smoke test;
4. upload installer and updater artifact to the dedicated COS release location;
5. configure Cloudflare release variables with exact URLs, size, notes, date, version, and signature;
6. verify `/api/client-releases` and updater endpoint;
7. test login-page download;
8. install the previous version and verify update/download/relaunch;
9. tag `desktop-vX.Y.Z`;
10. commit, push, and save the handoff prompt.

- [ ] **Step 6: Run configuration checks**

Run: `npm.cmd run desktop:check`

Expected: PASS.

Run: `npm.cmd run desktop:build`

Expected: signed artifact generation succeeds when signing environment variables are present.

- [ ] **Step 7: Commit and push**

```powershell
git add src-tauri/tauri.conf.json .gitignore .env.example DEPLOYMENT.md docs/windows-release-checklist.md
git commit -m "docs: add signed desktop release workflow"
git push origin main
```

---

### Task 9: End-to-End Verification and First Windows Release Candidate

**Files:**
- Modify only files required by defects discovered during verification.
- Create: `docs/windows-qa-report.md`

**Interfaces:**
- Consumes every prior task.
- Produces a tested Windows release candidate and recorded evidence.

- [ ] **Step 1: Run the full automated suite**

Run:

```powershell
node --test test/*.test.mjs
npm.cmd run build
npm.cmd run desktop:check
npm.cmd run desktop:build
```

Expected: every command exits 0.

- [ ] **Step 2: Verify the website build and public endpoints locally**

Run Pages local development and verify:

- `/api/health` returns 200 with `ok: true`.
- `/api/client-releases` returns Windows/Android objects without secrets.
- updater endpoint returns 204 when no newer configured release exists.
- login page opens and closes the client download modal without reopening on navigation.

- [ ] **Step 3: Install the NSIS release candidate on Windows**

Verify per-user installation, desktop/start-menu shortcuts, native title bar, default maximized state, minimum size, close-to-exit, and second-launch focus of the existing instance.

- [ ] **Step 4: Verify business workflows online**

Log into both companies and verify orders, history, insurance, customers, reports, admin export, settings, permissions, receipt upload/view/delete, one-page print, and Excel save dialog.

- [ ] **Step 5: Verify offline read-only behavior**

With previously loaded data visible, disable network access. Confirm the red banner appears, last sync time remains visible, navigation/view/print still work, and every mutation fails before an HTTP request. Restore network and confirm `重新连接` reloads cloud state.

- [ ] **Step 6: Verify update flow**

Install a lower test version, configure a higher signed release, and verify detection, optional prompt, progress, signature validation, `更新并重启`, and version change. Corrupt the test signature and confirm installation is rejected while the old version still runs.

- [ ] **Step 7: Record QA evidence**

`docs/windows-qa-report.md` must list the test machine Windows version, WebView2 version, installer filename and SHA-256, app version, automated command results, each manual scenario result, and any residual risk. Do not mark a scenario passed without executing it.

- [ ] **Step 8: Final commit and push**

Fix and verify any defects as separate scoped commits before creating the QA report commit. The final QA commit stages only the report:

```powershell
git add docs/windows-qa-report.md
git commit -m "test: verify Windows desktop release candidate"
git push origin main
```

- [ ] **Step 9: Save the final handoff prompt**

Include the final commit, installer location, release version, endpoint state, automated test totals, manual Windows QA result, Cloudflare/COS publication status, and the next uncompleted task. Never include COS, Cloudflare, or updater private keys in the handoff prompt.
