# APF Task 2: Permission Model and Mutation Gate Report

## Status

Completed on branch `codex/android-mobile-ui-atlas`. No session repository, connectivity callback, navigation, or UI was added.

## TDD Evidence

1. RED: Created `PermissionSnapshotTest` and `MutationGateTest` before the Task 2 production types existed.
   - Command: `gradlew.bat :app:testDebugUnitTest --tests "com.chengxu.autoservice.core.session.*"`
   - Result: failed in `compileDebugUnitTestKotlin` with the expected unresolved references for `UserRole`, `AppPermission`, `ConnectionState`, `PermissionSnapshot`, `MutationGate`, and `MutationDecision`.
2. GREEN: Added the five requested production files and ran the focused suite.
   - Command: `gradlew.bat :app:testDebugUnitTest --tests "com.chengxu.autoservice.core.session.*"`
   - Result: `BUILD SUCCESSFUL`.
3. Offline-priority regression proof: Added `offlineDenialTakesPriorityOverPermissionDenial`, temporarily moved the permission check before the offline check, and ran that test.
   - Result: one expected assertion failure. Restored offline-first ordering.
4. Allowed-path regression proof: Added `onlineAdministratorWithGrantedPermissionAllowsMutation`, temporarily changed the allowed branch to a denial, and ran that test.
   - Result: one expected assertion failure. Restored `MutationDecision.Allowed`.
5. Final verification:
   - Command: `gradlew.bat :app:testDebugUnitTest :app:assembleDebug`
   - Result: `BUILD SUCCESSFUL`.
   - Unit-test XML summary: 7 tests, 0 failures, 0 errors.

## Self-Review

- `UserRole` has only `EMPLOYEE` and `ADMINISTRATOR`; `AppPermission` lists all eight specified actions.
- `PermissionSnapshot.forRole` gives employees only view, create, edit, and status-advance permissions; administrators receive every enum entry.
- `MutationGate.evaluate` requires a non-optional `PermissionSnapshot`; there is no default role or administrator fallback.
- Offline is the first branch, so an offline employee settlement returns `网络不可用，当前为只读模式` rather than the permission denial.
- Online employee settlement returns `当前账号无此操作权限`; an online administrator with a granted permission is allowed.
- `ConnectionState` remains in `core/network`, with no real connectivity monitor introduced.
- Reviewed scope against the brief: changes are limited to Task 2 models, gate tests, and this required report.

## Commit

Pending creation after this report is staged with the Task 2 source and test files. No push will be performed.
