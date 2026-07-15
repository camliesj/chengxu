# Task 1 Report: Establish the Isolated Prototype and Screen Contract

## Status

DONE_WITH_CONCERNS

## Implemented

- Added the required contract test at `design/mobile-ui/tests/catalog.test.mjs`.
- Added the isolated Vite prototype root at `design/mobile-ui/index.html`.
- Added `design/mobile-ui/src/screen-catalog.js` with the 22-screen `SCREEN_CATALOG` contract from the brief.
- Added `design/mobile-ui/src/main.jsx` with `?screen=<id>` resolution, `SCREEN_REGISTRY` lookup, and explicit unknown-screen fallback.
- Added `design/mobile-ui/src/screens/registry.jsx` exporting an empty `SCREEN_REGISTRY` stub for Task 2 to extend.
- Added `design/mobile-ui/src/tokens.css` with CSS custom properties for color, spacing, safe-area variables, and the 360 / 412 / 768 breakpoints.
- Added `design/mobile-ui/src/app.css` with a minimal phone shell and unknown-screen presentation. `overflow-x: hidden` is set only on `.phone-shell`.
- Added `design/mobile-ui/playwright.config.mjs` with the exact server URL, viewport, and `npm.cmd run design:mobile` web server command from the brief.
- Updated `package.json` scripts:
  - `design:mobile`
  - `design:mobile:capture`
  - `test:mobile-ui`
- Preserved production isolation by not modifying `src/App.jsx`.

## RED

Command:

```powershell
node --test design/mobile-ui/tests/catalog.test.mjs
```

Key output:

```text
Error [ERR_MODULE_NOT_FOUND]: Cannot find module 'E:\codex\chengxu\design\mobile-ui\src\screen-catalog.js'
...
✖ design\mobile-ui\tests\catalog.test.mjs
```

Observed result:

- FAIL as expected because `design/mobile-ui/src/screen-catalog.js` did not exist yet.

## Dependency State

Already completed before final implementation:

```powershell
npm.cmd install --save-dev @playwright/test lucide-react
```

Observed result:

- Success. `package.json` and `package-lock.json` include the required dev dependencies.

Chromium installation was reported completed by the controller and was not re-run in this session.

## GREEN

Command:

```powershell
node --test design/mobile-ui/tests/catalog.test.mjs
```

Key output:

```text
✔ mobile UI catalog contains every approved screen exactly once
✔ every catalog entry has review metadata
ℹ pass 2
ℹ fail 0
```

Observed result:

- PASS. Both catalog contract tests succeeded.

## Production Build

Command:

```powershell
npm.cmd run build
```

Key output:

```text
vite v6.4.3 building for production...
✓ 60 modules transformed.
✓ built in 2.75s
```

Observed result:

- PASS. The existing production Vite build still succeeds.

## Test Results

- `node --test design/mobile-ui/tests/catalog.test.mjs`: PASS, 2 tests passed
- `npm.cmd run build`: PASS

## Files

Modified:

- `package.json`
- `package-lock.json`

Created:

- `design/mobile-ui/index.html`
- `design/mobile-ui/playwright.config.mjs`
- `design/mobile-ui/src/app.css`
- `design/mobile-ui/src/main.jsx`
- `design/mobile-ui/src/screen-catalog.js`
- `design/mobile-ui/src/tokens.css`
- `design/mobile-ui/src/screens/registry.jsx`
- `design/mobile-ui/tests/catalog.test.mjs`

## Self-Check

- Confirmed all work is isolated under `design/mobile-ui` except the required `package.json` and `package-lock.json` updates.
- Confirmed `src/App.jsx` was not modified.
- Confirmed `SCREEN_REGISTRY` is a minimal empty stub only, matching the instruction to leave formal registry expansion for Task 2.
- Confirmed routing entry reads `screen` from `URLSearchParams` and falls back to `SCREEN_CATALOG[0].id`.
- Confirmed the fallback UI is explicit when a screen id has no registered component.
- Confirmed `overflow-x: hidden` is applied only to `.phone-shell`.

## Concerns

- The screen labels in `design/mobile-ui/src/screen-catalog.js` were copied from the brief exactly as presented there, including mojibake-like encoded text. I did not normalize or reinterpret them because the brief says its exact values are authoritative.
- The prototype entry is intentionally minimal for Task 1, so every route currently renders the explicit unknown-screen state until Task 2 populates `SCREEN_REGISTRY`.
