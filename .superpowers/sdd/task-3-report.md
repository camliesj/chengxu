# Task 3 Report: Employee and Administrator Workbenches

## RED

- Added failing workbench assertions in [E:\codex\chengxu\design\mobile-ui\tests\visual.spec.mjs](E:\codex\chengxu\design\mobile-ui\tests\visual.spec.mjs) for:
  - employee workbench shows `今日工作`, four-state band labels, and no `办理结算`
  - administrator workbench shows `经营摘要`, `本月产值`, and visible `办理结算`
  - 360 / 412 responsive no-overflow checks
- Ran `npm.cmd run test:mobile-ui -- --grep workbench`
- Observed RED because `workbench-employee` / `workbench-admin` still resolved to placeholder content, so `今日工作` and `本月产值` were missing.

## GREEN

- Replaced only the `workbench-employee` and `workbench-admin` registry entries in [E:\codex\chengxu\design\mobile-ui\src\screens\registry.jsx](E:\codex\chengxu\design\mobile-ui\src\screens\registry.jsx); all other routes remain placeholder-backed.
- Added reusable single-layer summary component [E:\codex\chengxu\design\mobile-ui\src\components\OrderCard.jsx](E:\codex\chengxu\design\mobile-ui\src\components\OrderCard.jsx).
- Added role-aware workbench screens in [E:\codex\chengxu\design\mobile-ui\src\screens\WorkbenchScreens.jsx](E:\codex\chengxu\design\mobile-ui\src\screens\WorkbenchScreens.jsx).
- Extended fixed sample data in [E:\codex\chengxu\design\mobile-ui\src\mock-data.js](E:\codex\chengxu\design\mobile-ui\src\mock-data.js).
- Added workbench layouts and responsive rules in [E:\codex\chengxu\design\mobile-ui\src\app.css](E:\codex\chengxu\design\mobile-ui\src\app.css).
- Updated routing / visual assertions in:
  - [E:\codex\chengxu\design\mobile-ui\tests\routing.spec.mjs](E:\codex\chengxu\design\mobile-ui\tests\routing.spec.mjs)
  - [E:\codex\chengxu\design\mobile-ui\tests\visual.spec.mjs](E:\codex\chengxu\design\mobile-ui\tests\visual.spec.mjs)

## Visual Self-Check

- Captured fresh `workbench-employee` and `workbench-admin` screenshots at Pixel 7 dimensions for manual inspection.
- Verified:
  - four-state band stays full-width with four equal columns
  - two-column metric grid stays within shell bounds
  - bottom navigation remains pinned and does not shift
  - no visible horizontal overflow or text clipping at the inspected viewport
  - employee screen contains no `办理结算`
  - administrator screen surfaces both `经营摘要` and `办理结算`
- Admin screen places `优先事项` below the fold on a Pixel 7-sized capture; this is intentional and still reachable through main content scrolling while the bottom nav stays fixed.

## Verification

- Focused: `npm.cmd run test:mobile-ui -- --grep workbench`
- Full mobile: `npm.cmd run test:mobile-ui`
- Production build: `npm.cmd run build`
- Diff check: `git -c safe.directory=E:/codex/chengxu diff --check`

## Files

- Modified:
  - `design/mobile-ui/src/app.css`
  - `design/mobile-ui/src/mock-data.js`
  - `design/mobile-ui/src/screens/registry.jsx`
  - `design/mobile-ui/tests/routing.spec.mjs`
  - `design/mobile-ui/tests/visual.spec.mjs`
- Added:
  - `design/mobile-ui/src/components/OrderCard.jsx`
  - `design/mobile-ui/src/screens/WorkbenchScreens.jsx`

## Doubts / Follow-Up Notes

- `OrderCard` is intentionally conservative: one summary row stack plus optional primary action, so later order/record screens can reuse it without inheriting workbench-specific wrappers.
- Current verification covers 360 / 412 overflow through Playwright assertions; if later tasks add denser order actions, the card footer may need an alternate stacked action layout for narrower screens.

## Rework 2

### RED

- Strengthened [E:\codex\chengxu\design\mobile-ui\tests\visual.spec.mjs](E:\codex\chengxu\design\mobile-ui\tests\visual.spec.mjs) to require:
  - both roles render the same fixed-position summary slot via `data-role-summary`
  - employee summary shows `当班概览` and does not contain `经营摘要`
  - employee still has no `办理结算`
  - 360 / 412 overflow checks cover both `workbench-employee` and `workbench-admin`
- Ran focused workbench verification and observed RED because the employee screen had no summary section and the two roles were not structurally aligned.

### GREEN

- Refactored [E:\codex\chengxu\design\mobile-ui\src\screens\WorkbenchScreens.jsx](E:\codex\chengxu\design\mobile-ui\src\screens\WorkbenchScreens.jsx) to use one shared `WorkbenchLayout` with a fixed section order:
  - 状态带
  - 两列指标
  - 角色摘要槽位
  - 任务列表
- Kept the task list component hierarchy identical on both roles; only titles and data differ:
  - employee: `当班概览` + `我的待办`
  - admin: `经营摘要` + `优先事项`
- Updated [E:\codex\chengxu\design\mobile-ui\src\mock-data.js](E:\codex\chengxu\design\mobile-ui\src\mock-data.js) with `employeeRoleSummary` and `adminRoleSummary`.

### Rework Verification

- Focused workbench command:
  - `npx.cmd playwright test -c design/mobile-ui/playwright.config.mjs --grep workbench --workers 1`
  - All 8 workbench assertions printed `ok`, but the Playwright process did not exit before the 90 s shell timeout.
- Full mobile command:
  - `npx.cmd playwright test -c design/mobile-ui/playwright.config.mjs --workers 1`
  - All 18 mobile assertions printed `ok`, but the Playwright process again stayed alive past the 90 s shell timeout.
- Build:
  - `npm.cmd run build` passed.
- Diff check:
  - `git -c safe.directory=E:/codex/chengxu diff --check` returned only line-ending warnings, no whitespace errors.

### Rework Visual Notes

- The two roles now keep the same summary slot placement and the same task-list layer position.
- Employee summary contains only personal /现场数据 and no settlement or经营金额文案.
