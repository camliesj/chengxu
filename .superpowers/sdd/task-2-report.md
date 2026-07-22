# Stage 3 Task 2 Report

Status: original implementation committed as `a442ebf`; independent review repairs implemented and verified, repair commit pending.

## Changes

- Added the single shared operation lease module with the required `claimOperation`, `replayCompletedOperation`, `storeTerminalOperationResult`, and `readOperationResult` contracts.
- Migrated order creation to the shared 30-second lease implementation and retained compatibility re-exports from `order-foundation.js`.
- Added canonical 16-field edit normalization/diff, protected-field filtering, integer-cent validation and server-calculated total.
- Added authenticated `PATCH /api/orders/:id` and actor/company/action-scoped edit operation query.
- Added the ordered D1 batch: audit sentinel, optimistic versioned order update, conditional operation completion. All three `changes` are checked.
- Added stable terminal 409 storage/replay for version conflicts, latest safe detail and exact `conflictingFields`.
- Added safe edit audit changes; phone and VIN values are `[REDACTED]`.

## RED / GREEN Evidence

- Pure RED: `node --test test/orderEditLogic.test.mjs` failed with `ERR_MODULE_NOT_FOUND` for `functions/_shared/order-edit.js`.
- Pure GREEN plus create/foundation regression: 17/17 passed.
- Endpoint RED: `node --test test/orderEditApi.test.mjs` failed with `ERR_MODULE_NOT_FOUND` for the edit operation query route.
- Endpoint GREEN: 7/7 passed.
- Query-envelope RED: the focused query test failed because top-level `state` was `undefined`; after implementing the completed envelope it passed.
- Audit sensitivity check: temporarily removing redaction made the focused test fail on the submitted phone/VIN plaintext; restoring redaction returned the suite to 7/7.

## Verification

- Focused required command: `node --test test/orderEditLogic.test.mjs test/orderEditApi.test.mjs test/orderCreationApi.test.mjs` — 19/19 passed.
- Full Node command: `npm.cmd test` — 131/131 passed, 0 failed/skipped.
- Production build: `npm.cmd run build` — Vite 6.4.3 succeeded, 64 modules transformed.
- `git diff --check` passed before documentation updates; final check is recorded after staging/commit attempt.
- No deployment, remote D1 access/write, capability enablement, emulator start, or APK replacement occurred.

## Risks / Follow-up

- The fake D1 batch verifies SQL shape, ordering, result counts, idempotency and conflict behavior; no remote D1 integration was authorized or run.
- Legacy `POST /api/orders` edit compatibility is intentionally deferred to Stage 3 Task 3.
- `EDIT_ORDER` remains disabled in production until the later deployment task.
- `npm run build` removes tracked release assets under `dist`; the pre-existing APK was restored byte-for-byte from the main workspace copy, whose Git blob hash matched HEAD (`b3cf945a0861bffcaddd8034ae25a7474fc76c6b`).
- The original index permission block was resolved by the controller, which created commit `a442ebf feat(orders): add idempotent edit command` without pushing this isolated branch.

## Independent Review Repair

### Changes

- Full snapshots now require all 16 editable properties to be explicitly present. Missing optional fields are not converted to empty strings or metadata defaults.
- Existing completed operations are resolved from the canonical request hash before mutable order, permission, capability, status and dictionary checks. New/started commands still pass every current authorization and validation gate.
- Edit audit event IDs are stable SHA-256 values derived from `[companyId, actor, action, operationId]`, preventing a different actor's identical UUID from occupying the global `operation_logs.event_id` sentinel.
- Order update and operation completion both bind the scoped sentinel. Completion additionally requires company/order, `expectedVersion + 1`, the command's `updated_at`, and all 16 submitted values.
- Partial-batch reconciliation treats a command-owned `[0,1,1]` as completed success, recovers an updated order whose completion was missed, stores a stable 409 when the update did not happen, and reports an explicit 500 only for an impossible completed-operation/order mismatch.
- The fake D1 batch now executes each statement's lease, row, sentinel and postcondition checks; returned `changes` can be varied independently from actual state effects for resilience tests.

### RED / GREEN Evidence

- Removing each editable field initially failed at `vin`, which was silently normalized to `''`; all 16 parameterized cases now return `order.<field>.required`.
- A completed 409 replay after setting the order voided initially returned 404; separate voided, settled, capability-off, permission-revoked and dictionary-changed cases now replay the original 409, while a different complete hash returns `OPERATION_ID_REUSED`.
- A foreign audit row using the raw operation UUID reproduced actual `[0,1,1]` and an in-progress response. The scoped audit ID produces independent `[1,1,1]` success.
- A command-owned pre-existing sentinel now exercises `[0,1,1]` and returns success without duplicating audit or reporting conflict.
- A reported `[1,0,1]` initially completed the operation and returned `OPERATION_IN_PROGRESS`; the order postcondition makes actual effects `[1,0,0]` and stores/replays a 409.
- Spoofing only `version + 1` and the same timestamp initially returned false 200; completion now also compares all submitted values and returns the stable conflict.

### Repair Verification

- Required focused suite: 25/25 passed.
- Full Node suite: 137/137 passed, 0 failed/skipped.
- Vite 6.4.3 production build succeeded with 64 modules transformed.
- No employee ownership restriction was added because the approved design requires admin or `repair` permission, not assignment ownership.
- No deployment, remote D1 access/write, capability enablement, emulator, push, or APK replacement occurred. The build-cleaned APK was restored with HEAD blob `b3cf945a0861bffcaddd8034ae25a7474fc76c6b`.
- Repair commit attempt: `git add functions test docs/latest-handoff-prompt.md .superpowers/sdd/task-2-report.md` and `git commit -m "fix(orders): harden edit command atomicity"` both failed because Git could not create `E:/codex/chengxu/.git/worktrees/stage-3-edit-status/index.lock` (`Permission denied`). No elevation or retry was attempted; the controller must create this commit.

## Third Review: Failed Audit Sentinel Compensation

### Changes

- A failed versioned update now compensates the command-owned audit sentinel before storing a terminal 409.
- Cleanup matches only the derived event ID plus exact `update_order` / `repair_order` / target ID, so unrelated and foreign audit rows are preserved.
- The delete is guarded by the complete successful order postcondition: company/order, version, command timestamp, and all 17 persisted edit values including the calculated amount.
- After cleanup the command re-reads the order and operation. A concurrent exact completion is recovered as 200 without deleting its audit; a remaining sentinel or cleanup exception returns `AUDIT_SENTINEL_CLEANUP_FAILED` 500 and leaves the operation non-terminal.

### RED / GREEN Evidence

- Focused RED: the `[1,0,0]` path and a previously stranded same-command sentinel both failed with audit count `1 !== 0`; cleanup failure returned 409 instead of 500; concurrent exact success returned 409 instead of 200.
- Focused GREEN: `node --test --test-name-pattern "completion refuses|failed retry|audit cleanup" test/orderEditApi.test.mjs` — 4/4 passed.
- Endpoint GREEN: `node --test test/orderEditApi.test.mjs` — 15/15 passed.

### Final Verification

- Required focused suite: 28/28 passed.
- Full Node suite: 140/140 passed, 0 failed/skipped.
- Vite 6.4.3 production build succeeded with 64 modules transformed.
- The build-cleaned APK was restored byte-for-byte; working-copy and HEAD blobs both equal `b3cf945a0861bffcaddd8034ae25a7474fc76c6b`.
- `git diff --check` and the single commit attempt are recorded after this update.
