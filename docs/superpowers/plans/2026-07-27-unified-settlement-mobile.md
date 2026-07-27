# Unified Android Settlement Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. This repository's user instruction requires inline execution without subagents. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver web- and Android-consistent settlement, reversal, receipt screenshots, date selection, and work-order detail actions without changing the database schema.

**Architecture:** Add explicit versioned settlement and receipt-metadata commands beside the existing ordinary-status command, each backed by the existing `order_operations` lease/idempotency table and the existing `repair_orders` settlement columns. Migrate the web UI to those commands, then add a focused Android settlement boundary, ViewModel and Compose routes; binary receipt image operations remain a separate HTTP boundary using the existing `/api/receipts` service.

**Tech Stack:** Cloudflare Pages Functions + D1, React, Kotlin/Compose Material 3, Android Photo Picker, Room encrypted order store, Kotlin coroutines, Node test runner.

## Global Constraints

- Reuse `repair_orders.version`, existing settlement/receipt columns and `order_operations`; create no D1 or Room migration.
- Only an authenticated administrator with the server capability may settle, reverse settlement or maintain receipts; clients must not infer or bypass server authorization.
- Settlement requires `SETTLE_ORDER` and `MAINTAIN_RECEIPT`, status `待结算`, an expected version and an uploaded JPEG/PNG/WebP receipt of at most 12 MiB.
- Reverse settlement requires `REVERSE_SETTLEMENT`, status `已结算` and an expected version; reset payment to `待确认` and clear settlement date/time/remark while retaining receipt fields.
- Receipt upload/replacement must call a versioned metadata command after binary upload; receipt deletion must clear the versioned metadata reference before calling the binary delete endpoint, so a failed COS deletion never leaves the order pointing at missing content.
- Android must use the system photo picker only; do not request camera permission and do not start an emulator or connected Android tests.
- Dates selected by Android UI must be ISO `YYYY-MM-DD`; direct text editing is disabled for the affected fields.
- Every production change follows RED → GREEN. Full delivery requires commit, GitHub push, `docs/latest-handoff-prompt.md`, web tests/build, Android JVM tests, Android test-source compilation, lint, debug APK, release-copy and `apksigner` verification.

---

### Task 1: Versioned settlement, reverse-settlement and receipt-metadata Functions contract

**Files:**
- Create: `functions/_shared/order-settlement.js`
- Create: `functions/api/orders/[id]/settlement.js`
- Create: `functions/api/orders/[id]/reverse-settlement.js`
- Create: `functions/api/orders/[id]/receipt.js`
- Create: `functions/api/order-operations/settle-order/[id].js`
- Create: `functions/api/order-operations/reverse-settlement/[id].js`
- Create: `functions/api/order-operations/update-order-receipt/[id].js`
- Modify: `test/orderStatusContract.test.mjs`
- Modify: `test/orderEditContract.test.mjs`

**Interfaces:**
- Consumes: `claimOperation`, `findOperation`, `replayCompletedOperation`, `storeTerminalOperationResult` from `functions/_shared/order-command-operation.js`; `toMobileOrder` from `functions/api/orders.js`; `readCapabilities` and existing operation-log conventions.
- Produces: `handleSettlementCommand({ env, session, orderId, payload })`, `handleReverseSettlementCommand({ env, session, orderId, payload })`, `handleReceiptCommand({ env, session, orderId, payload })`, `readSettlementOperation({ env, session, action, operationId })`.
- Command payloads:

```js
{ operationId, expectedVersion, paymentMethod, settlementDate, settlementTime,
  settlementRemark, receipt: { key, name, contentType, sizeBytes, uploadedAt } }
// reverse: { operationId, expectedVersion }
// receipt update: { operationId, expectedVersion, receipt: ReceiptMetadata | null }
```

- [ ] **Step 1: Write failing Node contract tests**

```js
test('settlement requires both settlement and receipt capabilities, an owned image receipt, and a pending-settlement version', async () => {
  const response = await onRequestPost(settlementContext({
    status: '待结算', capabilities: ['SETTLE_ORDER'], receiptKey: 'receipts/tongda/2026/R-1.jpg',
  }));
  assert.equal(response.status, 403);
});

test('reverse settlement preserves receipt fields and clears only settlement values', async () => {
  const result = await handleReverseSettlementCommand(reverseFixture());
  assert.equal(result.order.status, '待结算');
  assert.equal(result.order.receipt.name, 'receipt.png');
});

test('receipt mutation requires receipt capability and clears only receipt metadata', async () => {
  const result = await handleReceiptCommand(receiptClearFixture());
  assert.equal(result.order.receipt, null);
  assert.equal(result.order.status, '已结算');
});
```

- [ ] **Step 2: Run the targeted test to verify RED**

Run: `node --test test/orderStatusContract.test.mjs`

Expected: FAIL because settlement route/handler does not exist.

- [ ] **Step 3: Implement the shared command handler**

```js
const key = { companyId, actor, action: 'settle-order', operationId };
const requestHash = await sha256Hex(JSON.stringify({ orderId, expectedVersion, settlement }));
// Validate prior operation, session role/capabilities, status, version and receipt key.
// Claim operation, then batch audit sentinel + versioned repair_orders update + completion row.
```

Use `payment_method = '待确认'`, empty `settlement_date`, `settlement_time`, and `settlement_remark` for reverse. Do not modify `settlement_receipt_*` in the reverse update. Return `{ order, capabilities, serverTime, operation }` through `toMobileOrder`.

- [ ] **Step 4: Register the six routes and operation readers**

```js
export async function onRequestPost(context) {
  const { session, error } = await requireSession(context.request, context.env);
  return error || handleSettlementCommand({ env: context.env, session, orderId: context.params.id,
    payload: await context.request.json().catch(() => ({})) });
}
```

Map the three query routes to the same handler with the fixed action string. The receipt endpoint only mutates `settlement_receipt_*`; it never deletes COS content itself. Do not add a broad dynamic action route.

- [ ] **Step 5: Run targeted tests to verify GREEN**

Run: `node --test test/orderStatusContract.test.mjs test/orderEditContract.test.mjs`

Expected: PASS, including unauthorized/forbidden, invalid receipt, stale version, idempotent replay, cross-company refusal, receipt metadata mutation and reverse receipt preservation.

- [ ] **Step 6: Commit and push the server contract**

```powershell
git add functions/_shared/order-settlement.js functions/api/orders functions/api/order-operations test
git commit -m "feat: add versioned settlement commands"
git push origin codex/android-mobile-ui-atlas
```

### Task 2: Migrate webpage settlement and reverse actions to the shared contract

**Files:**
- Modify: `src/App.jsx:503-550, 1180-1230, 2274-2304, 3226-3595`
- Modify: `test/orderStatusContract.test.mjs`

**Interfaces:**
- Consumes: Task 1 routes and receipt object returned by `POST /api/receipts`.
- Produces: `settleCloudOrder(order, draft)`, `reverseCloudSettlement(order)` and `updateCloudOrderReceipt(order, receipt)` that update local state only from returned `OrderDetail`.

- [ ] **Step 1: Write a failing web adapter test**

```js
test('web settlement posts the versioned command after receipt upload and uses the returned order', async () => {
  const request = await captureSettlementRequest();
  assert.equal(request.url, '/api/orders/RO-1/settlement');
  assert.equal(request.body.expectedVersion, 4);
  assert.equal(request.body.receipt.key, 'receipts/tongda/2026/RO-1.jpg');
});
```

- [ ] **Step 2: Run the new test to verify RED**

Run: `node --test test/orderStatusContract.test.mjs`

Expected: FAIL because the web flow still sends a legacy whole-order upsert.

- [ ] **Step 3: Replace only settlement and reverse persistence**

```js
const response = await apiFetch(`/api/orders/${encodeURIComponent(order.id)}/settlement`, {
  method: 'POST', headers: authHeaders(accessSession),
  body: JSON.stringify({ operationId, expectedVersion: order.version, ...draft, receipt }),
});
const saved = await response.json();
setOrders((rows) => replaceOrder(rows, saved.order));
```

Keep the existing `SettlementDialog` fields and receipt-before-settlement behavior. Reverse calls `/reverse-settlement` with a fresh operation ID and current version. Use the returned server record for UI state; show the existing cloud error path for 401/403/409/unknown result.
For an existing receipt upload/replacement, upload first and then post the returned metadata to `/api/orders/:id/receipt`. For delete, post `receipt: null`, replace local state from that response, then call `DELETE /api/receipts`; show a retriable binary-cleanup warning if the latter fails.

- [ ] **Step 4: Run focused and full web verification**

Run: `node --test test/orderStatusContract.test.mjs test/orderEditContract.test.mjs`; then `npm.cmd run build`

Expected: both commands exit 0.

- [ ] **Step 5: Commit and push web parity**

```powershell
git add src/App.jsx test/orderStatusContract.test.mjs
git commit -m "feat(web): use unified settlement commands"
git push origin codex/android-mobile-ui-atlas
```

### Task 3: Android settlement, receipt and operation data boundary

**Files:**
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/orders/model/OrderSettlementModels.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/orders/OrderSettlementApi.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/orders/HttpUrlConnectionOrderSettlementApi.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/orders/OrderReceiptApi.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/orders/HttpUrlConnectionOrderReceiptApi.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/orders/OrderSettlementRepository.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/core/orders/cache/EncryptedOrderStore.kt`
- Test: `android-client/app/src/test/java/com/chengxu/autoservice/core/orders/OrderSettlementRepositoryTest.kt`
- Test: `android-client/app/src/test/java/com/chengxu/autoservice/core/orders/HttpUrlConnectionOrderSettlementApiTest.kt`
- Test: `android-client/app/src/test/java/com/chengxu/autoservice/core/orders/HttpUrlConnectionOrderReceiptApiTest.kt`

**Interfaces:**

```kotlin
data class SettlementCommand(
    val operationId: String, val expectedVersion: Long, val paymentMethod: String,
    val settlementDate: String, val settlementTime: String, val settlementRemark: String,
    val receipt: ReceiptMetadata,
)
interface OrderSettlementRepository {
    suspend fun settle(orderId: String, command: SettlementCommand): OrderCommandResult<OrderDetail>
    suspend fun reverse(orderId: String, operationId: String, expectedVersion: Long): OrderCommandResult<OrderDetail>
    suspend fun updateReceipt(orderId: String, operationId: String, expectedVersion: Long, receipt: ReceiptMetadata?): OrderCommandResult<OrderDetail>
    suspend fun confirm(action: SettlementAction, operationId: String): OrderCommandResult<OrderDetail>
}
```

- [ ] **Step 1: Write failing JVM tests**

```kotlin
@Test fun settlementRejectsOfflineBeforeUploadOrCommand() = runTest {
    assertIs<OrderCommandResult.NetworkUnavailable>(repository.settle("RO-1", command()))
}

@Test fun reversePersistsTheServerDetailThatRetainsReceipt() = runTest {
    assertEquals("receipt.png", success(repository.reverse("RO-1", UUID, 4)).receipt?.name)
}
```

- [ ] **Step 2: Run the test classes to verify RED**

Run: `cd android-client; .\gradlew.bat :app:testDebugUnitTest --tests "*OrderSettlementRepositoryTest"`

Expected: FAIL because settlement types and repository do not exist.

- [ ] **Step 3: Implement models, HTTP mapping and repository**

Map `POST /api/orders/{id}/settlement`, `POST /api/orders/{id}/reverse-settlement`, `POST /api/orders/{id}/receipt`, and fixed action operation reads. Reuse `OrderCommandResult`, `parseOrderDetailEnvelope`, session invalidation, encrypted detail cache and summary cache semantics from `DefaultOrderStatusRepository`. Validate UUID, positive version, ISO date, time, receipt MIME and 12 MiB before transport.

- [ ] **Step 4: Implement receipt transport and local upload request**

```kotlin
interface OrderReceiptApi {
    suspend fun upload(token: String, orderId: String, image: ReceiptUpload): ReceiptResult
    suspend fun download(token: String, key: String): ReceiptDownloadResult
    suspend fun delete(token: String, orderId: String, key: String, eventId: String): ReceiptMutationResult
}
```

Use `multipart/form-data` with `file`, `orderId`, `eventId`, `logMode`. Validate file signature/MIME at the Android boundary and map 400/401/403/404/transport outcomes without logging image bytes or tokens.

- [ ] **Step 5: Run focused tests to verify GREEN**

Run: `cd android-client; .\gradlew.bat :app:testDebugUnitTest --tests "*OrderSettlementRepositoryTest" --tests "*HttpUrlConnectionOrderSettlementApiTest" --tests "*HttpUrlConnectionOrderReceiptApiTest"`

Expected: PASS.

- [ ] **Step 6: Commit and push Android data boundary**

```powershell
git add android-client/app/src/main/java/com/chengxu/autoservice/core/orders android-client/app/src/test/java/com/chengxu/autoservice/core/orders
git commit -m "feat(android): add settlement and receipt data boundary"
git push origin codex/android-mobile-ui-atlas
```

### Task 4: Android settlement state, navigation and receipt image flow

**Files:**
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/ui/settlement/SettlementViewModel.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/ui/settlement/SettlementModels.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/ui/settlement/SettlementScreen.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/ui/settlement/ReceiptImagePicker.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/navigation/AppRoute.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/navigation/AppNavDisplay.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/AutoserviceApp.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/MainActivity.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/ui/orders/OrderDetailScreen.kt`
- Test: `android-client/app/src/test/java/com/chengxu/autoservice/ui/settlement/SettlementViewModelTest.kt`
- Test: `android-client/app/src/androidTest/java/com/chengxu/autoservice/ui/settlement/SettlementScreenTest.kt`

**Interfaces:**

```kotlin
sealed interface SettlementEvent { data class Completed(val orderId: String) : SettlementEvent; data object Exit : SettlementEvent }
data class SettlementUiState(
  val orderId: String = "", val detail: OrderDetail? = null, val receipt: SelectedReceipt? = null,
  val canSettle: Boolean = false, val canMaintainReceipt: Boolean = false,
  val canReverse: Boolean = false, val submitState: SettlementSubmitState = SettlementSubmitState.Idle,
)
```

- [ ] **Step 1: Write failing ViewModel and Compose source tests**

```kotlin
@Test fun submitRequiresSelectedReceiptAndBothCapabilities() = runTest {
    viewModel.open(orderDetail(status = "待结算", capabilities = setOf(SETTLE_ORDER, MAINTAIN_RECEIPT)))
    viewModel.submit()
    assertEquals("请先选择到账回执截图", viewModel.uiState.value.receiptError)
}

@Test fun reverseConfirmationCallsRepositoryAndLeavesReceiptVisible() = runTest {
    repository.reverseResult = success(orderDetail(status = "待结算", receipt = receipt("receipt.png")))
    viewModel.confirmReverse()
    assertEquals("receipt.png", viewModel.uiState.value.detail?.receipt?.name)
}
```

Android source test must assert the selected image preview, disabled submit without receipt, payment selector, date-picker launch action, and destructive reverse confirmation.

- [ ] **Step 2: Run JVM test to verify RED**

Run: `cd android-client; .\gradlew.bat :app:testDebugUnitTest --tests "*SettlementViewModelTest"`

Expected: FAIL because settlement ViewModel/screen do not exist.

- [ ] **Step 3: Implement ViewModel state machine and routes**

Add `AppRoute.Settlement(orderId)` and `AppRoute.ReverseSettlement(orderId)`. Load `OrderDetail` and capabilities from the server before enabling mutations. Route ordinary current-order settlement from detail; route historical reverse only after full-detail capability load. On success refresh the appropriate summary/detail cache, return to the correct list and do not expose general history editing.

- [ ] **Step 4: Implement photo picker and receipt preview**

```kotlin
val picker = rememberLauncherForActivityResult(PickVisualMedia()) { uri: Uri? ->
    uri?.let { onReceiptSelected(it) }
}
```

Read one image through `ContentResolver`, reject unsupported type or size before upload, retain only the selected URI/thumbnail for the active screen, and clear it after success/cancel. Downloaded receipt images are decoded in memory for a dialog preview.

- [ ] **Step 5: Add full detail and receipt actions**

Replace summary-only detail rows with `OrderDetail` rows for payment, settlement, labor/material and receipt metadata. For upload/replacement call `updateReceipt` after the binary upload; for delete call `updateReceipt(..., null)` before binary delete. Show upload/delete/view controls only when the server capability permits; surface server errors inline; do not add print or camera controls.

- [ ] **Step 6: Run focused GREEN checks**

Run: `cd android-client; .\gradlew.bat :app:testDebugUnitTest --tests "*SettlementViewModelTest"`; then `.\gradlew.bat :app:compileDebugAndroidTestKotlin`

Expected: both commands exit 0; no emulator is started.

- [ ] **Step 7: Commit and push settlement UI**

```powershell
git add android-client/app/src/main android-client/app/src/test android-client/app/src/androidTest
git commit -m "feat(android): add settlement and reverse settlement UI"
git push origin codex/android-mobile-ui-atlas
```

### Task 5: Shared date picker and detail-header visual consistency

**Files:**
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/designsystem/BrandDateField.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/ui/create/CreateOrderComponents.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/ui/edit/EditOrderScreen.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/ui/records/InsurancePoliciesScreen.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/ui/orders/OrderDetailScreen.kt`
- Test: `android-client/app/src/test/java/com/chengxu/autoservice/core/designsystem/BrandDateFieldTest.kt`
- Test: `android-client/app/src/androidTest/java/com/chengxu/autoservice/OrderDetailScreenTest.kt`

**Interfaces:**

```kotlin
@Composable fun BrandDateField(
    label: String, value: String, onDateSelected: (String) -> Unit,
    enabled: Boolean, modifier: Modifier = Modifier,
)
fun parseIsoDateOrToday(value: String, today: LocalDate): LocalDate
```

- [ ] **Step 1: Write failing tests**

```kotlin
@Test fun parseIsoDateOrTodayRejectsInvalidInputAndFormatsSelectedDate() {
    assertEquals(LocalDate.of(2026, 7, 27), parseIsoDateOrToday("2026-07-27", fallback))
}
```

The Compose source tests assert that insurance date fields expose the date-picker action and are not editable text fields; the detail header test asserts an `edit-order` 44dp action and a separate read-only status chip.

- [ ] **Step 2: Run the unit test to verify RED**

Run: `cd android-client; .\gradlew.bat :app:testDebugUnitTest --tests "*BrandDateFieldTest"`

Expected: FAIL because the shared date component does not exist.

- [ ] **Step 3: Implement `BrandDateField` and replace date text inputs**

Use `DatePickerDialog` with the parsed existing date or current date. Render the ISO value in a read-only field with calendar affordance and 48dp control height; call `onDateSelected` only after user confirmation. Apply it to all specified create/edit/insurance/settlement dates.

- [ ] **Step 4: Implement compact title action**

Use a text action with the existing brand ink/action colors and pressed background, no white surface or outline. Keep it aligned to the title row, preserve a 44dp semantic touch target, and leave the read-only `StatusChip` unchanged.

- [ ] **Step 5: Run focused GREEN checks**

Run: `cd android-client; .\gradlew.bat :app:testDebugUnitTest --tests "*BrandDateFieldTest"`; then `.\gradlew.bat :app:compileDebugAndroidTestKotlin`

Expected: both commands exit 0.

- [ ] **Step 6: Commit and push date/UI package**

```powershell
git add android-client/app/src/main android-client/app/src/test android-client/app/src/androidTest
git commit -m "feat(android): add date picker and align detail actions"
git push origin codex/android-mobile-ui-atlas
```

### Task 6: End-to-end verification, APK and handoff

**Files:**
- Modify: `docs/latest-handoff-prompt.md`
- Modify: `docs/android-client.md`
- Modify: `dist/releases/android/autoservice-android-debug-0.1.0.apk`

**Interfaces:**
- Consumes: Tasks 1–5.
- Produces: verified Debug APK and an operator checklist for settlement/reverse, image receipt, date picker and title action.

- [ ] **Step 1: Run source hygiene checks**

Run: `git diff --check`

Expected: exit 0.

- [ ] **Step 2: Run full verification without an emulator**

Run:

```powershell
npm.cmd test
npm.cmd run build
cd android-client
$env:JAVA_HOME='E:\codex\APP\.android-build\jdk\jdk-17.0.19+10'
$env:ANDROID_HOME='E:\codex\APP\.android-build\android-sdk'
.\gradlew.bat :app:testDebugUnitTest :app:compileDebugAndroidTestKotlin :app:lintDebug :app:assembleDebug
```

Expected: all commands exit 0; no emulator or connected tests run.

- [ ] **Step 3: Archive and verify APK**

```powershell
Copy-Item android-client/app/build/outputs/apk/debug/app-debug.apk dist/releases/android/autoservice-android-debug-0.1.0.apk -Force
& E:\codex\APP\.android-build\android-sdk\build-tools\35.0.0\apksigner.bat verify --verbose dist/releases/android/autoservice-android-debug-0.1.0.apk
Get-FileHash -Algorithm SHA256 dist/releases/android/autoservice-android-debug-0.1.0.apk
```

Expected: v2 signature is true; record byte count and SHA-256.

- [ ] **Step 4: Update handoff and operator checklist**

Document routes, no-migration database state, capabilities, uploaded-image constraints, no-camera decision, verification output, APK hash and the required real-phone acceptance flow.

- [ ] **Step 5: Commit and push the completed package**

```powershell
git add docs/latest-handoff-prompt.md docs/android-client.md dist/releases/android/autoservice-android-debug-0.1.0.apk
git commit -m "docs: record Android settlement release"
git push origin codex/android-mobile-ui-atlas
```

## Plan self-review

- Spec coverage: Tasks 1–2 implement the cross-client contract; Tasks 3–4 implement Android data, mutation, receipt, history and detail paths; Task 5 implements all requested date and header interaction changes; Task 6 verifies and packages the delivery.
- Scope: Void and archived-order editing are deliberately excluded and named in the spec; printing remains a desktop-only difference.
- Type consistency: Task 3 defines `SettlementCommand`, `OrderSettlementRepository`, `OrderSettlementApi`, and `OrderReceiptApi`; Task 4 consumes those names without introducing alternatives.
- Completeness scan: every production task has a concrete RED command, implementation boundary, GREEN command and commit.
