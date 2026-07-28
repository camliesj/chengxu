# Unified Archives and Auto Provisioning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make work-order creation atomically provision customer-vehicle and insurance archives for both web and Android, then make Android expose the same archive-management workflows as the web app.

**Architecture:** Extend the existing idempotent order-creation command so its D1 batch contains archive upserts based on company and plate, preserving existing archive ids and insurance user-entered amount/type. Remove the web client’s post-create archive writes and refresh instead. Extend Android’s existing cached archive repositories and Navigation 3 records route with vehicle writes and an accessible three-category archive selector.

**Tech Stack:** Cloudflare Pages Functions with D1, React/Vite, Kotlin/Compose/Navigation 3, Room + encrypted store, JVM and Node test runners.

## Global Constraints

- Core web and Android business behavior, data results, permissions, and statuses must remain aligned.
- Do not start an Android emulator or run connected Android tests.
- Do not add a D1 or Room migration in this feature package.
- Do not deploy remote D1 migrations or Pages without a separate explicit user authorization.
- Date fields continue to use the existing Android `BrandDateField` picker.
- Build and retain a v2-signed API 26+ debug APK at `dist/releases/android/autoservice-android-debug-0.1.0.apk`.
- Update `docs/latest-handoff-prompt.md`, commit, and push after each completed feature package.

---

### Task 1: Atomically provision archives in the server create command

**Files:**
- Modify: `functions/_shared/order-creation.js`
- Modify: `test/orderCreationApi.test.mjs`
- Test: `test/orderCreationApi.test.mjs`

**Consumes:** `normalizeCreateOrderCommand`, `createOrderRow`, the existing claimed `order_operations` lease, and existing `(company_id, id, record_json)` archive tables.

**Produces:** `buildArchiveProvisioningStatements(env, companyId, order)` returning D1 statements that upsert a customer vehicle and, when `insuranceExpiry` is populated, an insurance policy in the same create batch.

- [ ] **Step 1: Write failing server tests for automatic archive creation**

Add a test that creates the canonical payload and asserts that the single recorded batch contains SQL for all of:

```js
assert.equal(batch.some((statement) => statement.sql.includes('INSERT INTO customer_vehicles')), true);
assert.equal(batch.some((statement) => statement.sql.includes('INSERT INTO insurance_policies')), true);
assert.equal(batch.some((statement) => statement.values.includes('CV-RO20260700001')), true);
assert.equal(batch.some((statement) => statement.values.includes('IP-RO20260700001')), true);
```

Add a separate case with `insuranceExpiry: ''` and metadata whose required fields omit `insuranceExpiry`; assert the customer-vehicle statement exists and no insurance-policy statement exists.

- [ ] **Step 2: Run the focused Node test and verify RED**

Run: `npm.cmd test -- test/orderCreationApi.test.mjs`

Expected: FAIL because the current create batch contains only the work order, operation completion, and audit statements.

- [ ] **Step 3: Implement plate-matched archive upserts**

In `order-creation.js`, add helpers that query the current company’s archive rows by `json_extract(record_json, '$.plate') = ?`, parse a matching record safely, and construct values with these exact rules:

```js
vehicle = {
  ...existingVehicle,
  id: existingVehicle?.id || `CV-${order.id}`,
  companyId,
  customer: order.customer,
  phone: order.phone,
  plate: order.plate,
  car: order.car,
  vin: order.vin,
  insurer: order.insurer,
  vehicleType: order.type,
  source: '维修接待',
  remark: `最近工单：${order.id}`,
};
policy = {
  ...existingPolicy,
  id: existingPolicy?.id || `IP-${order.id}`,
  companyId,
  customer: order.customer,
  phone: order.phone,
  plate: order.plate,
  car: order.car,
  vin: order.vin,
  insurer: order.insurer,
  expiry: order.insuranceExpiry,
  amount: existingPolicy?.amount || 0,
  type: existingPolicy?.type || '交强险 / 商业险',
};
```

Use `INSERT ... ON CONFLICT(company_id, id) DO UPDATE` for vehicles. For policies, set version to `existingVersion + 1` when a matching policy exists and 1 otherwise, and persist `updated_at = datetime('now')`. Fetch existing archive rows before constructing the existing order batch, then append both upserts before operation completion; do not introduce a separate HTTP request or post-commit write.

- [ ] **Step 4: Extend the in-memory D1 fixture for match and replay assertions**

Teach `environment()` in `orderCreationApi.test.mjs` to return configured archive rows from `first()`/`all()` only for the new archive lookup SQL and to record all batch statements. Add a replay assertion that a second request with the same operation id creates no second batch, preserving existing command idempotency.

- [ ] **Step 5: Run focused tests and commit server behavior**

Run: `npm.cmd test -- test/orderCreationApi.test.mjs test/orderCreationLogic.test.mjs`

Expected: PASS with archive creation, no-insurance, existing-record reuse, and replay coverage.

Commit:

```text
feat(server): provision archives with created orders
```

### Task 2: Refresh web archives after order creation instead of client-side duplication

**Files:**
- Modify: `src/App.jsx`
- Create: `src/archiveRefreshLogic.js`
- Create: `test/archiveRefreshLogic.test.mjs`
- Test: `test/archiveRefreshLogic.test.mjs`

**Consumes:** successful `createOrderCommand`, `fetchCloudCustomerVehicles`, and `fetchCloudInsurancePolicies`.

**Produces:** an exported `refreshCompanyArchives({ companyId, session, fetchVehicles, fetchPolicies })` workflow used only after a successful creation response.

- [ ] **Step 1: Write a failing web refresh-logic test**

Create `test/archiveRefreshLogic.test.mjs` with injected fetch functions and assert a successful refresh returns both server collections exactly once:

```js
const result = await refreshCompanyArchives({
  companyId: 'tongda', session: { token: 'token' },
  fetchVehicles: async () => [{ id: 'CV-1', companyId: 'tongda' }],
  fetchPolicies: async () => [{ id: 'IP-1', companyId: 'tongda', version: 1 }],
});
assert.deepEqual(result.vehicles.map((row) => row.id), ['CV-1']);
assert.deepEqual(result.policies.map((row) => row.id), ['IP-1']);
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm.cmd test -- test/archiveRefreshLogic.test.mjs`

Expected: FAIL because `archiveRefreshLogic.js` does not exist.

- [ ] **Step 3: Implement and wire creation-side archive refreshes**

Implement the helper with `Promise.all([fetchVehicles(session), fetchPolicies(session)])` and export it. In `App.jsx`, inject existing `fetchCloudCustomerVehicles` and `fetchCloudInsurancePolicies`, then replace only the created order’s `companyId` records in React state. Call it after `createOrderFromWizard` and the create branch of `saveOrder`; retain edit-side archive synchronization. On refresh failure, keep the created work order and set the existing archive sync warning without attempting a client write.

- [ ] **Step 4: Run focused test and build**

Run: `npm.cmd test -- test/archiveRefreshLogic.test.mjs test/orderCreationWebLogic.test.mjs`

Run: `npm.cmd run build`

Expected: both PASS.

- [ ] **Step 5: Commit web refresh behavior**

Commit:

```text
fix(web): refresh auto-provisioned archives after create
```

### Task 3: Add Android customer-vehicle writes and permission parity

**Files:**
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/core/orders/CustomerVehiclesApi.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/core/orders/HttpUrlConnectionCustomerVehiclesApi.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/core/orders/CustomerVehiclesRepository.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/core/model/AppPermission.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/core/session/PermissionSnapshot.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/ui/records/CustomerVehiclesViewModel.kt`
- Test: `android-client/app/src/test/java/com/chengxu/autoservice/core/orders/HttpUrlConnectionCustomerVehiclesApiTest.kt`
- Test: `android-client/app/src/test/java/com/chengxu/autoservice/core/orders/CustomerVehiclesRepositoryTest.kt`
- Test: `android-client/app/src/test/java/com/chengxu/autoservice/ui/records/CustomerVehiclesViewModelTest.kt`

**Consumes:** `POST /api/customer-vehicles` and its existing `customers` permission boundary.

**Produces:** `CustomerVehiclesDataSource.save(record)` plus `CustomerVehiclesUiState` fields for create/edit drafts, online submit state, and maintenance permission.

- [ ] **Step 1: Write failing API and permission tests**

Add a transport test that invokes `api.save(token, record)` and asserts:

```kotlin
assertEquals("POST", request.method)
assertEquals("Bearer token", request.headers["Authorization"])
assertEquals("/api/customer-vehicles", request.path)
assertContains(request.body, "\"plate\":\"粤A12345\"")
```

Add permission assertions that server key `customers` grants `VIEW_RECORDS` and a new `MANAGE_CUSTOMER_VEHICLES`, while `history` remains read-only.

- [ ] **Step 2: Run focused JVM tests and verify RED**

Run: `./gradlew.bat :app:testDebugUnitTest --tests "*CustomerVehicles*"`

Expected: FAIL because the API and data source do not expose save and the permission does not exist.

- [ ] **Step 3: Implement save result mapping and cached upsert**

Add a `CustomerVehicleWriteResult.Success(record)` / failure result, implement JSON serialization and 200/201/401/other mappings in `HttpUrlConnectionCustomerVehiclesApi`, and add `save(record)` to the repository and data source. Enforce current session company, online network, and current identity before POST; on success, replace the matching cached record by id and return idle; on unauthorized clear cache and invalidate session; otherwise expose a user-readable write error.

Add `MANAGE_CUSTOMER_VEHICLES` and map only server `customers` to it. In the ViewModel, create UUID-based drafts using the current company id, validate nonblank customer/plate/car, and expose `openCreate`, `openEdit`, `updateDraft`, `save`, and `dismissEditor`.

- [ ] **Step 4: Add green repository and ViewModel tests**

Test save success writes exactly one record with the session company, rejects an offline write before API invocation, and leaves a cross-company record untouched. Test the ViewModel exposes an enabled editor only when both `customers` permission and online status are present.

- [ ] **Step 5: Run focused JVM tests and commit Android data layer**

Run: `./gradlew.bat :app:testDebugUnitTest --tests "*CustomerVehicles*" --tests "*PermissionSnapshot*"`

Expected: PASS.

Commit:

```text
feat(android): manage customer vehicle archives
```

### Task 4: Make Android archive navigation discoverable and expose vehicle maintenance UI

**Files:**
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/navigation/AppNavDisplay.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/ui/records/CustomerVehiclesScreen.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/AutoserviceApp.kt`
- Test: `android-client/app/src/test/java/com/chengxu/autoservice/navigation/AppNavDisplayTest.kt`
- Test: `android-client/app/src/androidTest/java/com/chengxu/autoservice/ui/records/CustomerVehiclesScreenTest.kt`

**Consumes:** enhanced vehicle ViewModel state and existing insurance/history states.

**Produces:** a horizontally scrollable archive category selector with counts and a vehicle create/edit form that follows the project’s date/control styling.

- [ ] **Step 1: Write failing navigation/UI tests**

Add a unit or Compose source test proving all three labels are present at once and the vehicle tab count is rendered. Add a screen test that, with `canManage = true`, exposes “新增客户车辆”, opens an editor, and shows editable customer, plate, car, VIN, insurer, vehicle type, source, and remark fields. Assert that without management permission the create control is absent.

- [ ] **Step 2: Compile test code and verify RED**

Run: `./gradlew.bat :app:compileDebugAndroidTestKotlin`

Expected: FAIL because the new tags/actions and editable screen state are absent.

- [ ] **Step 3: Implement archive selector and vehicle editor**

Replace the fixed-width `Row` of archive filters in `RecordsTabs` with a `LazyRow` or `ScrollableTabRow` using the existing brand control visual language. Each label includes its current count: `维修历史 (${historyState.allOrders.size})`, `客户车辆 (${vehicleState.records.size})`, and `保险档案 (${insuranceState.records.size})`.

Extend `CustomerVehiclesScreen` to render an online/authorized “新增客户车辆” action, a full editor when a draft exists, and edit action from detail. Reuse `BrandTextField`, existing selectable chip patterns, `AutoserviceCard`, and brand buttons; do not introduce a visually unrelated primary button. Wire every action through `AutoserviceApp` and `AppNavDisplay`, keeping the existing detail route.

- [ ] **Step 4: Compile tests and run relevant JVM tests**

Run: `./gradlew.bat :app:testDebugUnitTest --tests "*CustomerVehiclesViewModelTest" --tests "*AppNavDisplayTest"`

Run: `./gradlew.bat :app:compileDebugAndroidTestKotlin`

Expected: PASS; do not run connected tests.

- [ ] **Step 5: Commit Android archive UI**

Commit:

```text
feat(android): expose full archive navigation
```

### Task 5: Refresh Android archives after create, verify the complete package, and hand off

**Files:**
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/AutoserviceApp.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/ui/create/CreateOrderArchiveRefresh.kt`
- Modify: `docs/latest-handoff-prompt.md`
- Test: `android-client/app/src/test/java/com/chengxu/autoservice/ui/create/CreateOrderArchiveRefreshTest.kt`

**Consumes:** `CreateOrderEvent.Created`, `CustomerVehiclesDataSource.refresh`, and `InsurancePoliciesDataSource.refresh`.

**Produces:** a testable `refreshArchivesAfterCreate(vehicles, policies)` suspend function and archive refreshes that occur after a confirmed order creation without delaying detail navigation.

- [ ] **Step 1: Write a failing archive-refresh helper test**

Create fakes for customer vehicles and insurance data sources that count `refresh()` calls. Call `refreshArchivesAfterCreate(vehicles, policies)` and assert exactly one refresh call per source, including when one refresh throws an exception.

- [ ] **Step 2: Run focused JVM test and verify RED**

Run: `./gradlew.bat :app:testDebugUnitTest --tests "*CreateOrderArchiveRefreshTest"`

Expected: FAIL because `CreateOrderArchiveRefresh.kt` does not exist.

- [ ] **Step 3: Implement non-blocking archive refresh**

Implement `refreshArchivesAfterCreate` with `supervisorScope` and two `launch` children so a failed archive refresh does not cancel the other. In the `CreateOrderEvent.Created` branch, launch that helper in the existing coroutine scope and immediately call `navigationState.openCreatedOrder(event.orderId)`. Do not convert a created order into an error or re-run creation.

- [ ] **Step 4: Run full no-device verification**

Run: `npm.cmd test`

Run: `npm.cmd run build`

Run from `android-client` with configured `JAVA_HOME` and `ANDROID_HOME`:

```powershell
./gradlew.bat :app:testDebugUnitTest
./gradlew.bat :app:compileDebugAndroidTestKotlin
./gradlew.bat :app:lintDebug
./gradlew.bat :app:assembleDebug
```

Copy the produced debug APK to `dist/releases/android/autoservice-android-debug-0.1.0.apk` and run Build Tools 35.0.0 `apksigner verify --verbose` against the archived APK. Expected: all commands succeed and v2 signing is true.

- [ ] **Step 5: Update handoff, commit, and push the package**

Record the completed behavior, changed files, unchanged D1/Room structure, verification output, APK SHA-256, and the next core package in `docs/latest-handoff-prompt.md`.

Commit:

```text
feat(android): align archive provisioning workflows
```

Push `codex/android-mobile-ui-atlas` only after all verification commands pass. Do not deploy D1 or Pages.
