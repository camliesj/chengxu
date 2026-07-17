# HTML Brand UI Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and visually verify an interactive 390×844 HTML prototype that translates the supplied automotive-app references into the autoservice login, workbench, five-tab shell, profile, and system states.

**Architecture:** Upgrade the existing `design/mobile-ui/` Vite/React atlas rather than creating a second prototype. Keep deterministic `?screen=` routes for screenshots and tests, and add one stateful `?prototype=brand` journey that links login, employee/admin workbench, stage placeholders, profile, dialogs, and logout using shared brand components.

**Tech Stack:** React 19, Vite 6, CSS custom properties, Hugeicons React with free Stroke Rounded icons, Playwright 1.61, Node test runner, built-in ImageGen for missing raster assets.

## Global Constraints

- The approved visual source is `design/mobile-ui/reference/xpeng-ui-overview.png` plus `design/mobile-ui/reference/xpeng-ui-interaction-states.png`.
- Borrow the automotive-app visual language, not the source brand logo, model names, social feed, store, or iOS system chrome.
- Full-fidelity scope is login, employee/admin workbench, five-tab navigation, profile, loading/offline/error/disabled/dialog/sheet states.
- Orders, create, and records tabs get the new shell plus honest high-quality stage/empty states; this task does not add production business behavior.
- HTML uses simulated local state only; never call production APIs or persist credentials.
- Use Hugeicons Stroke Rounded consistently; do not draw icons, use emoji, mix Lucide into the upgraded screens, or commit a Hugeicons license/API token.
- Generate only missing raster assets with the built-in ImageGen tool. Assets must have no external brand marks, watermarks, embedded UI text, or copied people.
- Every interactive control must expose default, pointer-hover, pressed, focus-visible, selected where applicable, and disabled behavior.
- Touch targets are at least 48×48 CSS pixels. Essential flows must be keyboard operable, and reduced motion must suppress non-essential scale/translation.
- Primary viewport is 390×844. Also verify 360×800 and 412×915 without horizontal overflow or off-screen primary actions.
- Keep existing atlas screen IDs and unrelated web/desktop production code intact.
- After every important task: update `docs/latest-handoff-prompt.md`, commit Git, and push `codex/android-mobile-ui-atlas`.

---

## File Structure

- `design/mobile-ui/src/BrandPrototypeApp.jsx`: stateful end-to-end HTML prototype journey.
- `design/mobile-ui/src/prototype-state.js`: pure reducer and initial state for login, role, tab, overlays, and logout.
- `design/mobile-ui/src/components/BrandIcon.jsx`: single Hugeicons rendering boundary.
- `design/mobile-ui/src/components/InteractiveSurface.jsx`: shared pointer/press/focus/disabled state behavior.
- `design/mobile-ui/src/components/BrandButton.jsx`: primary, secondary, quiet, and danger buttons.
- `design/mobile-ui/src/components/BrandField.jsx`: labeled input and password visibility behavior.
- Existing shell, navigation, metric, status, form, overlay, and screen files are upgraded in place and consume the shared primitives.
- `design/mobile-ui/src/assets/brand/asset-manifest.js`: explicit raster asset paths, dimensions, use sites, and alt text.
- `design/mobile-ui/public/brand-assets/`: generated PNG assets only.
- `design/mobile-ui/tests/brand-*.spec.mjs`: focused interaction/accessibility/responsive tests.
- `design/mobile-ui/design-qa.md`: reference-to-prototype comparison and blocking visual QA result.

---

### Task 1: Asset inventory and Hugeicons boundary

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `design/mobile-ui/src/components/BrandIcon.jsx`
- Create: `design/mobile-ui/src/assets/brand/icon-map.js`
- Create: `design/mobile-ui/src/assets/brand/asset-manifest.js`
- Create: `design/mobile-ui/public/brand-assets/login-service-vehicle.png`
- Create: `design/mobile-ui/public/brand-assets/empty-service-tools.png`
- Create: `design/mobile-ui/tests/brand-assets.spec.mjs`
- Modify: `docs/latest-handoff-prompt.md`

**Interfaces:**
- Produces: `BrandIcon({ name, size = 24, strokeWidth = 1.5, decorative = false })`.
- Produces: `BRAND_ASSETS.loginHero` and `BRAND_ASSETS.emptyState`, each with `src`, `width`, `height`, and `alt`.

- [ ] **Step 1: Write failing asset and icon tests**

Add tests that open the state gallery and assert every `[data-brand-icon]` is an SVG produced by `BrandIcon`, no upgraded screen contains `.lucide`, and both manifest images load with non-zero natural dimensions and transparent PNG file names.

```js
test('brand screens use Hugeicons and load declared image assets', async ({ page }) => {
  await page.goto('/?screen=states-gallery');
  await expect(page.locator('[data-brand-icon]')).not.toHaveCount(0);
  await expect(page.locator('.lucide')).toHaveCount(0);
  const broken = await page.locator('[data-brand-asset]').evaluateAll((images) =>
    images.filter((image) => image.naturalWidth === 0 || image.naturalHeight === 0).length,
  );
  expect(broken).toBe(0);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npx.cmd playwright test -c design/mobile-ui/playwright.config.mjs brand-assets.spec.mjs`

Expected: FAIL because brand icon markers and image assets do not exist.

- [ ] **Step 3: Install official Hugeicons packages**

Run: `npm.cmd install @hugeicons/react @hugeicons/core-free-icons`

Expected: both dependencies are recorded and `package-lock.json` is updated without adding any private registry token.

- [ ] **Step 4: Create the icon map and rendering boundary**

Map only these approved concepts from `@hugeicons/core-free-icons`: `home`, `orders`, `add`, `records`, `profile`, `user`, `lock`, `eye`, `eyeOff`, `check`, `arrowRight`, `car`, `tools`, `shield`, `wallet`, `calendar`, `cloud`, `offline`, `warning`, `close`, `logout`, `building`, `refresh`, `chevronDown`.

```jsx
export function BrandIcon({ name, size = 24, strokeWidth = 1.5, decorative = false }) {
  const icon = BRAND_ICON_MAP[name];
  if (!icon) throw new Error(`Unknown brand icon: ${name}`);
  return (
    <HugeiconsIcon
      data-brand-icon={name}
      icon={icon}
      size={size}
      strokeWidth={strokeWidth}
      aria-hidden={decorative || undefined}
      focusable="false"
    />
  );
}
```

- [ ] **Step 5: Generate the two missing raster assets**

Use the built-in ImageGen tool with the supplied reference screenshots attached as art direction. Generate each asset separately and inspect it before saving.

Asset A prompt:

```text
Premium automotive service app hero asset, sleek unbranded graphite sedan in three-quarter front view inside a bright immaculate modern repair workshop, cool ice-blue daylight, soft realistic floor reflection, understated luxury automotive advertising photography, isolated clean subject composition with generous negative space above and left, no people, no text, no logo, no watermark, transparent background PNG, landscape 3:2, intended display slot 358×250 CSS pixels.
```

Asset B prompt:

```text
Minimal premium automotive service empty-state asset, unbranded compact service tool trolley with one torque wrench and a small car silhouette object, pearl white and graphite materials with cool ice-blue highlights, realistic product photography, centered isolated object, no people, no text, no logo, no watermark, transparent background PNG, landscape 4:3, intended display slot 220×165 CSS pixels.
```

Post-process only to remove a non-transparent background or resize; do not redraw the asset. Save at least 2× display resolution. Confirm alpha exists at all four corners.

- [ ] **Step 6: Implement the asset manifest and rerun tests**

```js
export const BRAND_ASSETS = Object.freeze({
  loginHero: {
    src: '/brand-assets/login-service-vehicle.png',
    width: 716,
    height: 500,
    alt: '现代汽修车间中的服务车辆',
  },
  emptyState: {
    src: '/brand-assets/empty-service-tools.png',
    width: 440,
    height: 330,
    alt: '车辆维修工具与设备',
  },
});
```

Run: `npx.cmd playwright test -c design/mobile-ui/playwright.config.mjs brand-assets.spec.mjs`

Expected: PASS.

- [ ] **Step 7: Update handoff, commit, and push**

Record dependency names, exact generated asset files, dimensions, alpha inspection, and focused test result. Commit message: `feat(design): add brand assets and hugeicons`. Push the current branch.

---

### Task 2: Brand tokens and interactive component states

**Files:**
- Modify: `design/mobile-ui/src/tokens.css`
- Modify: `design/mobile-ui/src/app.css`
- Create: `design/mobile-ui/src/components/InteractiveSurface.jsx`
- Create: `design/mobile-ui/src/components/BrandButton.jsx`
- Create: `design/mobile-ui/src/components/BrandField.jsx`
- Modify: `design/mobile-ui/src/components/MetricCard.jsx`
- Modify: `design/mobile-ui/src/components/StatusPill.jsx`
- Modify: `design/mobile-ui/src/screens/ProfileScreens.jsx`
- Create: `design/mobile-ui/tests/brand-states.spec.mjs`
- Modify: `docs/latest-handoff-prompt.md`

**Interfaces:**
- Produces: `InteractiveSurface({ as, disabled, selected, className, children, ...props })`.
- Produces: `BrandButton({ tone, disabled, loading, icon, children, ...props })`.
- Produces: `BrandField({ label, error, leadingIcon, trailingAction, ...inputProps })`.

- [ ] **Step 1: Write failing state-gallery tests**

Assert the gallery contains named examples for button, icon button, navigation item, selection card, metric card, field, and dialog action. For every component require `default`, `hover`, `pressed`, `focus`, `selected` where applicable, and `disabled` fixtures through `data-force-state`.

```js
for (const state of ['default', 'hover', 'pressed', 'focus', 'disabled']) {
  await expect(page.locator(`[data-component="button"][data-force-state="${state}"]`)).toBeVisible();
}
await expect(page.locator('[data-force-state="disabled"] button')).toBeDisabled();
```

- [ ] **Step 2: Run and verify RED**

Run: `npx.cmd playwright test -c design/mobile-ui/playwright.config.mjs brand-states.spec.mjs`

Expected: FAIL because forced state fixtures and shared primitives do not exist.

- [ ] **Step 3: Replace the token system**

Define exact initial tokens for prototype tuning:

```css
:root {
  --brand-canvas: #f4f6f8;
  --brand-surface: #ffffff;
  --brand-surface-soft: #f0f3f7;
  --brand-ice: #eaf1fb;
  --brand-ink: #101214;
  --brand-ink-muted: #697079;
  --brand-line: #e3e7ec;
  --brand-action: #111315;
  --brand-action-on: #ffffff;
  --brand-success: #25805f;
  --brand-warning: #a96816;
  --brand-danger: #b84a45;
  --brand-radius-shell: 24px;
  --brand-radius-panel: 20px;
  --brand-radius-card: 16px;
  --brand-shadow-shell: 0 24px 64px rgb(24 33 47 / 14%);
  --brand-shadow-hover: 0 10px 28px rgb(24 33 47 / 10%);
  --brand-motion-fast: 120ms;
  --brand-motion-base: 180ms;
}
```

Preserve the existing `--atlas-*` aliases by mapping them to brand tokens so out-of-scope screens continue rendering.

- [ ] **Step 4: Implement interaction primitives**

`InteractiveSurface` owns disabled attributes, `aria-disabled`, selected state, and classes; actual hover/focus/active behavior is CSS based. Forced state attributes exist only for the gallery.

Use CSS selectors for both real and forced states:

```css
.interactive-surface:is(:hover, [data-force-state='hover']):not(:disabled, [aria-disabled='true']) {
  background-color: var(--interactive-hover);
  box-shadow: var(--brand-shadow-hover);
  transform: translateY(-1px);
}
.interactive-surface:is(:active, [data-force-state='pressed']):not(:disabled, [aria-disabled='true']) {
  transform: scale(.98);
}
.interactive-surface:is(:focus-visible, [data-force-state='focus']) {
  outline: 2px solid var(--brand-ink);
  outline-offset: 3px;
}
@media (prefers-reduced-motion: reduce) {
  .interactive-surface { transition: none; }
  .interactive-surface:is(:active, [data-force-state='pressed']) { transform: none; }
}
```

- [ ] **Step 5: Rebuild the states gallery with shared primitives**

Keep existing loading, empty, error, success, offline, and disabled business examples, then add the complete interaction matrix. No gallery example may use a different component than production screens.

- [ ] **Step 6: Run focused tests and full mobile UI regression**

Run: `npx.cmd playwright test -c design/mobile-ui/playwright.config.mjs brand-states.spec.mjs`

Run: `npm.cmd run test:mobile-ui`

Expected: all tests pass; any old color-value assertions are updated to semantic selectors rather than obsolete blue hex values.

- [ ] **Step 7: Update handoff, commit, and push**

Record locked tokens and component state coverage. Commit message: `feat(design): add automotive brand system`. Push the current branch.

---

### Task 3: Interactive login and prototype state reducer

**Files:**
- Create: `design/mobile-ui/src/prototype-state.js`
- Create: `design/mobile-ui/src/BrandPrototypeApp.jsx`
- Modify: `design/mobile-ui/src/main.jsx`
- Modify: `design/mobile-ui/src/screens/AuthScreens.jsx`
- Modify: `design/mobile-ui/src/components/FormControls.jsx`
- Create: `design/mobile-ui/tests/brand-login.spec.mjs`
- Create: `design/mobile-ui/tests/prototype-state.test.mjs`
- Modify: `docs/latest-handoff-prompt.md`

**Interfaces:**
- Produces: `initialPrototypeState`, `prototypeReducer(state, event)`.
- Produces: `LoginCompanyScreen({ state, dispatch })` for the stateful journey while retaining a deterministic default for `?screen=login-company`.

- [ ] **Step 1: Write reducer and browser tests first**

Reducer cases must include `SELECT_COMPANY`, `SET_USERNAME`, `SET_PASSWORD`, `TOGGLE_PASSWORD`, `SUBMIT_LOGIN`, `LOGIN_FAILED`, `LOGIN_SUCCEEDED`, `SWITCH_ROLE`, `SELECT_TAB`, `OPEN_OVERLAY`, `CLOSE_OVERLAY`, and `LOGOUT`.

Browser test flow:

```js
await page.goto('/?prototype=brand');
await page.getByRole('button', { name: /鑫齐恒汽车服务中心/ }).click();
await page.getByLabel('账号').fill('worker');
await page.getByLabel('密码').fill('secret12');
await page.getByRole('button', { name: '显示密码' }).click();
await page.getByRole('button', { name: '进入系统' }).click();
await expect(page.getByRole('heading', { name: '今日工作' })).toBeVisible();
```

Also prove empty input displays field errors, submitting state disables inputs/button, Enter submits, and password text is never rendered elsewhere in the page.

- [ ] **Step 2: Run both tests and verify RED**

Run: `node --test design/mobile-ui/tests/prototype-state.test.mjs`

Run: `npx.cmd playwright test -c design/mobile-ui/playwright.config.mjs brand-login.spec.mjs`

Expected: FAIL because the reducer and prototype route do not exist.

- [ ] **Step 3: Implement the pure reducer**

Use an explicit state shape:

```js
export const initialPrototypeState = Object.freeze({
  authenticated: false,
  companyId: 'tongda',
  username: '',
  password: '',
  passwordVisible: false,
  submitting: false,
  errors: {},
  role: 'employee',
  activeTab: 'workbench',
  overlay: null,
});
```

`SUBMIT_LOGIN` validates company, trimmed username, and password; `LOGIN_SUCCEEDED` clears password before authenticating; `LOGOUT` resets to a fresh unauthenticated state.

- [ ] **Step 4: Build the high-fidelity login screen**

Use a 390px shell with ice-blue ambient header and generated vehicle image occupying the measured 358×250 slot. Place the white login panel in normal flow with a -28px visual overlap, not absolute positioning that can hide fields on 360×800.

Company selection cards, fields, password toggle, errors, submitting state, and primary button must use shared components and Hugeicons. Static screenshot route uses safe display data and never includes a password value.

- [ ] **Step 5: Add the stateful prototype route**

`main.jsx` selects `BrandPrototypeApp` only when `prototype=brand`; existing `screen` and `atlas` routing remains deterministic.

- [ ] **Step 6: Run tests and responsive checks**

Run: `node --test design/mobile-ui/tests/prototype-state.test.mjs`

Run: `npx.cmd playwright test -c design/mobile-ui/playwright.config.mjs brand-login.spec.mjs`

Run: `npm.cmd run test:mobile-ui`

Expected: PASS at 360×800, 390×844, and 412×915 with the submit action reachable and no horizontal overflow.

- [ ] **Step 7: Update handoff, commit, and push**

Record login interactions and no-API/no-credential persistence boundary. Commit message: `feat(design): build interactive brand login`. Push the current branch.

---

### Task 4: Five-tab shell, profile, overlays, and stage states

**Files:**
- Modify: `design/mobile-ui/src/components/MobileShell.jsx`
- Modify: `design/mobile-ui/src/components/BottomNav.jsx`
- Modify: `design/mobile-ui/src/components/Overlays.jsx`
- Modify: `design/mobile-ui/src/screens/ProfileScreens.jsx`
- Modify: `design/mobile-ui/src/screens/registry.jsx`
- Modify: `design/mobile-ui/src/BrandPrototypeApp.jsx`
- Create: `design/mobile-ui/src/screens/BrandStageScreens.jsx`
- Create: `design/mobile-ui/tests/brand-shell.spec.mjs`
- Modify: `docs/latest-handoff-prompt.md`

**Interfaces:**
- Consumes: `dispatch({ type: 'SELECT_TAB', tab })`, `OPEN_OVERLAY`, `CLOSE_OVERLAY`, `LOGOUT`.
- Produces: stateful navigation for `workbench`, `orders`, `add`, `records`, `profile`.

- [ ] **Step 1: Write shell and overlay tests**

After simulated login, click all five tabs and verify `aria-current`, heading, and preserved role. Assert the central add control is 48×48 minimum. Profile logout opens a dialog, Escape/cancel restores focus, confirm returns to login and clears profile content. Offline stage disables “新增工单”.

- [ ] **Step 2: Run and verify RED**

Run: `npx.cmd playwright test -c design/mobile-ui/playwright.config.mjs brand-shell.spec.mjs`

Expected: FAIL because the stateful shell, new navigation behavior, and focus restoration are absent.

- [ ] **Step 3: Upgrade the shell and navigation**

Keep header/main/nav as a three-row grid. The main region alone scrolls. Use white translucent navigation, thin top line, Hugeicons, and a near-black center add circle. Every tab is a real button; stage-disabled behavior uses the business gate, not CSS-only opacity.

- [ ] **Step 4: Implement honest stage states**

Orders, create, and records prototype tabs show the generated transparent empty-state asset, concise copy, phase label, and one relevant non-destructive action. Do not render fake forms or write buttons as working features. The static legacy detailed routes stay registered and must continue passing their existing tests.

- [ ] **Step 5: Implement profile and overlay behavior**

Profile shows staff identity, company, role, sync status, security note, and logout. Dialogs use `role="dialog"`, `aria-modal="true"`, labeled title, initial focus on the safe action, Escape close, and focus return. Bottom sheets use the same overlay controller and cannot scroll the background.

- [ ] **Step 6: Run shell and full regression tests**

Run: `npx.cmd playwright test -c design/mobile-ui/playwright.config.mjs brand-shell.spec.mjs`

Run: `npm.cmd run test:mobile-ui`

Expected: PASS, including the existing pinned-nav and overlay contract tests.

- [ ] **Step 7: Update handoff, commit, and push**

Record interactive navigation, overlay focus behavior, and stage boundaries. Commit message: `feat(design): upgrade brand navigation shell`. Push the current branch.

---

### Task 5: Employee and administrator workbenches

**Files:**
- Modify: `design/mobile-ui/src/screens/WorkbenchScreens.jsx`
- Modify: `design/mobile-ui/src/components/MetricCard.jsx`
- Modify: `design/mobile-ui/src/components/OrderCard.jsx`
- Modify: `design/mobile-ui/src/mock-data.js`
- Modify: `design/mobile-ui/src/BrandPrototypeApp.jsx`
- Create: `design/mobile-ui/tests/brand-workbench.spec.mjs`
- Modify: `docs/latest-handoff-prompt.md`

**Interfaces:**
- Consumes: `role`, `dispatch`, shared shell/components/assets.
- Produces: `EmployeeWorkbenchScreen` and `AdminWorkbenchScreen` with the same layout grammar and distinct content/permissions.

- [ ] **Step 1: Write role and interaction tests**

Assert employee sees today reception, in-repair, pending delivery, insurance expiry and no settlement action. Assert administrator sees monthly output, pending amount, in-repair, insurance expiry and settlement. Switching the debug role updates content without returning to login. Metric and order cards are keyboard reachable and expose pressed/disabled feedback where actionable.

- [ ] **Step 2: Run and verify RED**

Run: `npx.cmd playwright test -c design/mobile-ui/playwright.config.mjs brand-workbench.spec.mjs`

Expected: FAIL because the upgraded role switch and shared card interactions are absent.

- [ ] **Step 3: Build the shared workbench composition**

Create one internal `BrandWorkbench` composition receiving `role`, metrics, quick actions, priorities, and recent orders. Header uses ice-blue atmosphere, greeting, company, status chip, and circular profile action. Put status summary in a horizontally safe four-column band; on 360px reduce gaps and typography rather than horizontal scrolling.

- [ ] **Step 4: Upgrade metrics, actions, and orders**

Metric cards use low-saturation semantic surfaces and near-black values. Quick actions are 48px controls with Hugeicons. Recent orders show plate/customer, summary, status, order number, and amount with a full-card focus target. Preserve existing permission-based omissions.

- [ ] **Step 5: Add debug role switching only to the HTML prototype**

Expose an unobtrusive “员工 / 管理员” segmented control under a `data-prototype-control` container. It must not appear on deterministic production-reference screenshots unless `debugRole=1` or `prototype=brand` is active.

- [ ] **Step 6: Run focused, full, and responsive tests**

Run: `npx.cmd playwright test -c design/mobile-ui/playwright.config.mjs brand-workbench.spec.mjs`

Run: `npm.cmd run test:mobile-ui`

Expected: PASS at all three required phone viewports; the bottom navigation stays pinned while workbench main content scrolls.

- [ ] **Step 7: Update handoff, commit, and push**

Record employee/admin parity and permission differences. Commit message: `feat(design): upgrade role workbenches`. Push the current branch.

---

### Task 6: Automated capture, visual QA, and prototype handoff

**Files:**
- Modify: `design/mobile-ui/tests/capture.spec.mjs`
- Modify: `design/mobile-ui/tests/visual.spec.mjs`
- Create: `design/mobile-ui/tests/brand-accessibility.spec.mjs`
- Create: `design/mobile-ui/design-qa.md`
- Modify: `docs/mobile-ui-atlas.md`
- Modify: `docs/latest-handoff-prompt.md`
- Update generated screenshots: `design/mobile-ui/output/*.png`

**Interfaces:**
- Verifies: login, employee/admin workbench, shell stages, profile, offline, dialog, sheet, state gallery.
- Produces: passing `design-qa.md`, refreshed output screenshots, and a running local prototype URL.

- [ ] **Step 1: Add final automated checks**

Accessibility tests cover logical Tab order, visible focus, 48px targets, no click on disabled controls, dialog focus trap/return, `aria-current`, labels, reduced motion, and non-color selected indicators. Visual tests cover 360×800, 390×844, and 412×915 overflow and primary action visibility.

- [ ] **Step 2: Run complete functional verification**

Run: `npm.cmd run test:mobile-ui`

Run: `npx.cmd vite build design/mobile-ui --outDir ../../dist/mobile-ui-prototype`

Run: `npm.cmd run build`

Expected: all Playwright tests pass, the standalone prototype build succeeds, and the repository production build remains successful.

- [ ] **Step 3: Capture deterministic screenshots**

Run: `npm.cmd run design:mobile:capture`

Capture at minimum `login-company`, `workbench-employee`, `workbench-admin`, `profile-sync`, `offline-readonly`, `states-gallery`, one confirm dialog, one bottom sheet, and the stateful prototype workbench at 390×844.

- [ ] **Step 4: Run blocking visual comparison**

Read the Product Design `design-qa` skill before this step. Create same-size comparison boards containing the relevant reference crop and prototype screenshot side by side. Inspect spacing, card radii, text weights, background tone, image crop, nav geometry, modal scrim, disabled opacity, focus ring, and hover/pressed state frames.

Write `design/mobile-ui/design-qa.md` with P0–P3 findings and `final result: blocked` until all P0/P1/P2 findings are fixed. Repeat capture and comparison after fixes. Only finish when it says:

```text
final result: passed
```

- [ ] **Step 5: Start and keep the local prototype running**

Start `npm.cmd run design:mobile` in a hidden background process and verify `http://127.0.0.1:4175/?prototype=brand` in the approved browser surface. Exercise login, role switch, all five tabs, profile, dialog, cancel, logout, and keyboard focus. Check the browser console has no errors.

- [ ] **Step 6: Update documentation and handoff**

Document the brand prototype URL/query, screen catalog, interaction states, Hugeicons dependency, generated assets, test command, capture command, QA result, and the next Compose-migration design checkpoint. In the handoff record exact test counts, build result, capture outputs, remaining P3 notes, and that production API/cache work is still paused.

- [ ] **Step 7: Commit and push**

Commit source, tests, generated assets, screenshots, `design-qa.md`, and docs with message `docs(design): verify brand html prototype`. Push the current branch and confirm local HEAD equals `origin/codex/android-mobile-ui-atlas`.

---

## Plan Self-Review

- Spec coverage: reference preservation, visual system, Hugeicons, generated transparent assets, all approved screens, full interaction states, accessibility, responsive layouts, deterministic capture, visual comparison, HTML-first sequencing, and handoff discipline each have an owning task.
- Scope isolation: the stateful prototype is separate from production APIs and Android; legacy atlas routes stay intact; Compose and Room work remain future checkpoints.
- Placeholder scan: every task contains exact files, interfaces, commands, state names, copy boundaries, or asset prompts; no deferred implementation markers remain.
- Type consistency: `BrandIcon`, `BRAND_ASSETS`, `InteractiveSurface`, `BrandButton`, `BrandField`, `initialPrototypeState`, and `prototypeReducer` are introduced before their consumers and keep identical signatures.
