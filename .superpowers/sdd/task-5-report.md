# Task 5 Report: Android Mobile UI Atlas Form Flow

Date: 2026-07-15
Branch: `codex/android-mobile-ui-atlas`
Scope: Task 5 four-step create flow and edit state under `design/mobile-ui/`

## RED

- Added focused Playwright assertions for:
  - create-step progress and headings
  - required insurance expiry label
  - locked entry date and editable entry time
  - requirement-style placeholders
  - edit-mode tabs, order number, prefilled real values, and no four-step progress
  - 360 x 800 single-column / no horizontal overflow
  - 768 x 1024 two-column layout
- Initial focused run failed because the five catalog form routes were still placeholder screens.

## GREEN

- Replaced catalog placeholders for:
  - `order-create-customer`
  - `order-create-insurance`
  - `order-create-repair`
  - `order-create-review`
  - `order-edit`
- Added `design/mobile-ui/src/screens/OrderFormScreens.jsx` with:
  - screen-id-driven full-screen modal rendering
  - fixed header and bottom actions
  - phone single-column / tablet two-column form grid
  - create flow fields for the four steps
  - edit mode with `编辑工单`, visible order number, `保存修改`, tabs, and real prefilled values
- Extended shared form controls for disabled inputs and multiline fields.
- Added form dictionaries and realistic edit-state values to `mock-data.js`.
- Tightened existing mobile visual assertions so the full suite passes cleanly with the new screens.

## Verification

- Focused form tests:
  - `npm.cmd run test:mobile-ui -- --grep "create flow|insurance expiry|requirement placeholders|edit form|form layouts"`
  - Result: all targeted assertions passed. Earlier auto-managed run hit the known Windows teardown hang after assertions completed; final verification used manual Vite start/stop for clean exit.
- Full mobile tests:
  - manual Vite start via `npm.cmd run design:mobile`
  - `npm.cmd run test:mobile-ui`
  - Result: `38 passed`
- Production build:
  - `npm.cmd run build`
  - Result: success
- Whitespace / diff check:
  - `git -c safe.directory=E:/codex/chengxu diff --check`
  - Result: pass

## Visual Self-Check

- Confirmed 360 x 800 create-form screen remains single-column with no horizontal overflow.
- Confirmed 768 x 1024 insurance step switches to two columns.
- Confirmed fixed title area and bottom action area stay visible inside the full-screen modal shell.
- Confirmed review step uses three top-level summary groups only: `客户车辆`, `保险事故`, `维修费用`.
- Confirmed edit mode hides four-step progress and shows tabs plus real values instead of demo-looking placeholders.
- Confirmed light theme, 8 px radius language, Lucide iconography, and no gradient treatment were preserved.

## Cleanup

- Stopped manual Vite server after verification.
- Removed `test-results/` and build output from the workspace after checks.

## Rework Addendum

- Review follow-up required two concrete fixes:
  - edit mode tabs had to become real `useState`-driven tabs with `aria-selected`, `aria-controls`, and a single rendered `tabpanel`
  - review summary had to include `进厂日期` and `进厂时间` using the same values as Step 3
- Added RED assertions first:
  - create review screen must show `进厂日期 / 2026-07-15 / 进厂时间 / 08:12`
  - edit screen must default to customer panel only, then switch to insurance panel only, then repair panel only
- Verified RED with manual Vite:
  - `npm.cmd run test:mobile-ui -- --grep "create flow exposes|edit form shows"`
  - Result before fix: 2 failures, matching the missing summary fields and static tabs
- Implemented GREEN:
  - `OrderEditScreen` now uses `React.useState` for active tab
  - each tab exposes explicit `aria-controls`
  - only the current `tabpanel` is rendered
  - review summary now includes entry date/time
- Re-verified with manual Vite clean exit:
  - focused run: `2 passed`
  - full run: `38 passed`
  - `npm.cmd run build`: success
  - `git -c safe.directory=E:/codex/chengxu diff --check`: pass
