# Android Customer Vehicle Archive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` for inline task-by-task execution. Steps use checkbox syntax for tracking.

**Goal:** Add a read-only, enterprise-isolated customer-vehicle tab to Android Records using the existing service endpoint and encrypted Room table.

**Architecture:** A dedicated HTTP API and repository mirror the existing history-read flow: observe encrypted company cache, then refresh only while online. Records owns a local history/customer-vehicle tab; the session root injects the new repository and continues using updated state for Navigation 3 entries.

**Tech Stack:** Kotlin, Compose Material 3, Navigation 3, Room, Kotlin serialization, Android Keystore AES-GCM, Flow, JUnit, Compose UI tests.

## Global Constraints

- Only `GET /api/customer-vehicles` with the active Bearer token; Android never calls POST in this batch.
- Service `customers` permission remains authoritative. Offline performs no network I/O; 401 invalidates the session and clears cache.
- Cache identity is `companyId + recordId`; complete payload remains encrypted in existing Room v2 `customer_vehicles`.
- No D1/Room migration, production deployment, capability change, insurance archive, customer-vehicle writing, or administrator correction.
- After each accepted task update handoff, commit, and push.

---

### Task 1: Read contract and HTTP client

**Files:** create `core/orders/CustomerVehiclesApi.kt`, `core/orders/HttpUrlConnectionCustomerVehiclesApi.kt`, and `test/.../HttpUrlConnectionCustomerVehiclesApiTest.kt`.

**Produces:** `CustomerVehicleRecord`, `CustomerVehiclesApi.fetch(token)`, and success/failure result types.

- [ ] Write tests for Bearer GET, valid vehicles array, missing/foreign `id/companyId`, 401, 403/404, 5xx, I/O, malformed JSON, and cancellation.
- [ ] Run `:app:testDebugUnitTest --tests com.chengxu.autoservice.core.orders.HttpUrlConnectionCustomerVehiclesApiTest`; verify RED because contract/client do not exist.
- [ ] Implement the minimal timeout/JSON/error-mapping pattern from `HttpUrlConnectionHistoryOrdersApi`; validate every record and never log token, phone, VIN, or payload.
- [ ] Re-run the focused test for GREEN; commit `feat(android): add customer vehicle read contract`.

### Task 2: Encrypted cache and session-safe repository

**Files:** modify `cache/FoundationDao.kt` and `cache/EncryptedOrderStore.kt`; create `core/orders/CustomerVehiclesRepository.kt`, `CustomerVehiclesRepositoryTest.kt`, and `EncryptedCustomerVehicleStoreTest.kt`.

**Produces:** `CustomerVehicleCache : AuthenticatedDataCleaner` with company-scoped observe/replace/clear, plus `CustomerVehiclesDataSource.snapshot` and `refresh()`.

- [ ] Write tests for encrypted round trip, foreign-company exclusion, damaged ciphertext deletion, cache-first emission, online replacement, offline no-request, stale failure retaining cache, and 401 clear/invalidate.
- [ ] Run the two focused JVM test classes and verify RED because cache/repository symbols do not exist.
- [ ] Add only company-scoped DAO queries; serialize and encrypt full records with `StringCipher`; mirror `HistoryOrdersRepository` identity, mutex, online and invalidation behavior without cursor pagination.
- [ ] Run focused tests plus `HistoryOrdersRepositoryTest` for GREEN; commit `feat(android): cache customer vehicle archive`.

### Task 3: Records tab, local search, and read-only detail

**Files:** create `ui/records/CustomerVehicleRecordsModels.kt`, `CustomerVehicleRecordsViewModel.kt`, `CustomerVehicleRecordsScreen.kt`, matching JVM/Compose tests; modify `HistoryRecordsScreen.kt` and `navigation/AppNavDisplay.kt`.

**Produces:** `CustomerVehicleRecordsUiState`, `updateQuery`, `refresh`, and a `RecordsTab` selector for `维修历史` / `客户车辆`.

- [ ] Write tests for customer/plate/car search, active-tab changes without leaving Records, cards/detail, offline, empty/no-permission/error states, no associated cached order, and absence of all write actions.
- [ ] Run the new focused JVM and connected Compose test classes; verify RED because the tab, ViewModel, and screen do not exist.
- [ ] Implement the smallest two-tab read-only UI using current brand controls. Detail may enter only already cached current/history orders; no match shows an honest no-associated-order state and issues no remote write.
- [ ] Re-run new tests plus `HistoryRecordsViewModelTest` and `HistoryRecordsScreenTest` for GREEN; commit `feat(android): show customer vehicle archive`.

### Task 4: Application wiring, verification, APK

**Files:** modify `MainActivity.kt`, `AutoserviceApp.kt`, `ui/shell/AutoserviceShell.kt`, `navigation/AppNavDisplayTest.kt`, `docs/android-client.md`, `docs/latest-handoff-prompt.md`, and release APK.

**Consumes:** Task 2 data source and Task 3 ViewModel/UI state.

- [ ] Extend `AppNavDisplayTest` so the customer-vehicle tab changes its filtered cards in place; run it first and verify RED because the session root does not inject the state/callbacks.
- [ ] Instantiate the API/repository in `MainActivity`, collect the ViewModel at the authenticated session root, and pass it through Shell/NavDisplay using updated state for retained NavEntry content.
- [ ] Run `npm.cmd test`, `npm.cmd run build`, and `:app:testDebugUnitTest :app:compileDebugAndroidTestKotlin :app:lintDebug :app:assembleDebug`; run the focused connected tests for the two Records tabs.
- [ ] Copy the Debug APK to `dist/releases/android/autoservice-android-debug-0.1.0.apk`, verify with Build Tools 35 `apksigner`, record size/SHA-256 in both documents, then commit `release(android): deliver customer vehicle archive`, pull, and push.

## Plan Self-Review

- Tasks 1–2 cover service, encryption, cache, session, and failure semantics; Task 3 covers the read-only UI; Task 4 covers integration and delivery.
- The plan contains no write endpoint, migration, insurance, admin correction, remote D1/Pages, or capability operation.
