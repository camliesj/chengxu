# Android Mobile UI Atlas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reproducible React-based Android visual prototype and export at least 22 consistent PNG screens covering every approved tab, role variation, form step, overlay, and system state.

**Architecture:** Keep the visual prototype isolated under `design/mobile-ui/`; it must not import or modify the production `src/App.jsx` entry point. A small screen catalog defines the required coverage, reusable mobile primitives render each screen from fixed sample data, and Playwright runs the prototype through Vite to verify responsive behavior and capture deterministic PNG files into `design/mobile-ui/output/`.

**Tech Stack:** React 19, Vite 6, `lucide-react`, CSS design tokens, Node test runner, Playwright Chromium.

## Global Constraints

- The approved specification is `docs/superpowers/specs/2026-07-15-android-mobile-ui-design.md`.
- The fixed navigation is Workbench, Work Orders, Add, Records, Profile.
- The visual direction is a light operational workspace with prominent repair status communication.
- Use `#F5F7FA` background, `#FFFFFF` surfaces, `#1677FF` primary, and 8 px component radius.
- Employees can change status through Awaiting Settlement but cannot settle, reverse settlement, or void orders.
- Administrators can settle, reverse settlement, void orders, and manage receipts.
- The visual prototype uses fixed sample data and must not call cloud APIs, COS, or production storage.
- Do not add account administration, permission assignment, dictionaries, logs, export, or background notifications to the mobile atlas.
- Every PNG is captured at 390 x 844 CSS pixels with device scale factor 1; responsive QA also covers 360 x 800, 412 x 915, and 768 x 1024.
- Use Lucide icons. Do not draw ad-hoc SVG icons or use emoji as interface icons.
- No horizontal scrolling, overlapping text, decorative orbs, one-note blue layouts, or nested cards.

---

## File Structure

```text
design/mobile-ui/
  index.html                         Vite entry document
  src/
    main.jsx                         Query-driven prototype entry and gallery selector
    screen-catalog.js                Canonical 22-screen coverage list
    mock-data.js                     Fixed Chinese shop, order, customer, and insurance data
    tokens.css                       Colors, type, spacing, elevation, responsive rules
    app.css                          App shell, layouts, and screen composition
    components/
      AtlasBoard.jsx                 Labeled desktop review board for screen groups
      MobileShell.jsx                Phone viewport and safe-area structure
      BottomNav.jsx                  Fixed five-item navigation
      StatusPill.jsx                 Text + icon semantic statuses
      MetricCard.jsx                 Actionable operational metric
      OrderCard.jsx                  Mobile work-order summary
      FormControls.jsx               Input/select/date/money visual controls
      Overlays.jsx                   Bottom sheet, full-screen modal, center dialog
      StatePanel.jsx                 Loading, empty, error, permission, offline states
    screens/
      AuthScreens.jsx                Company selection and login
      WorkbenchScreens.jsx           Employee and administrator workbenches
      OrderScreens.jsx               List, filters, details, status and settlement
      OrderFormScreens.jsx           Four create steps and edit state
      RecordScreens.jsx              Customer, insurance, and history records
      ProfileScreens.jsx             Profile, sync, offline, and state gallery
      registry.jsx                   Screen id to React component mapping
  tests/
    catalog.test.mjs                 Node coverage and metadata checks
    visual.spec.mjs                  Playwright layout, accessibility, and viewport checks
    capture.spec.mjs                 Deterministic PNG export
  playwright.config.mjs              Isolated Vite web server and Chromium configuration
  output/                             Generated 22 PNG files and four atlas boards
docs/
  mobile-ui-atlas.md                 Screen index, review notes, and generation commands
```

## Shared Interfaces

```js
// design/mobile-ui/src/screen-catalog.js
export const SCREEN_CATALOG = [
  { id: 'login-company', label: '登录与公司选择', group: 'auth', role: 'all' },
];

// design/mobile-ui/src/screens/registry.jsx
export const SCREEN_REGISTRY = {
  'login-company': LoginCompanyScreen,
};

// design/mobile-ui/src/components/MobileShell.jsx
export function MobileShell({ title, subtitle, action, activeTab, offline, children }) {}

// design/mobile-ui/src/components/Overlays.jsx
export function BottomSheet({ title, children, primaryLabel, secondaryLabel }) {}
export function FullScreenModal({ title, subtitle, children, footer }) {}
export function ConfirmDialog({ tone, title, description, confirmLabel, cancelLabel }) {}
```

---

### Task 1: Establish the Isolated Prototype and Screen Contract

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `design/mobile-ui/index.html`
- Create: `design/mobile-ui/src/screen-catalog.js`
- Create: `design/mobile-ui/src/main.jsx`
- Create: `design/mobile-ui/src/tokens.css`
- Create: `design/mobile-ui/src/app.css`
- Create: `design/mobile-ui/tests/catalog.test.mjs`
- Create: `design/mobile-ui/playwright.config.mjs`

**Interfaces:**
- Produces: `SCREEN_CATALOG`, the canonical list consumed by the registry, tests, capture suite, and documentation.
- Produces: `?screen=<id>` routing for deterministic screen capture.
- Consumes: no production runtime modules.

- [ ] **Step 1: Write the failing catalog contract test**

```js
// design/mobile-ui/tests/catalog.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { SCREEN_CATALOG } from '../src/screen-catalog.js';

const required = [
  'login-company', 'workbench-employee', 'workbench-admin',
  'orders-current', 'orders-filter-sheet', 'order-detail-employee',
  'order-detail-admin', 'order-create-customer', 'order-create-insurance',
  'order-create-repair', 'order-create-review', 'order-edit',
  'order-status-dialog', 'order-settlement', 'receipt-upload',
  'reverse-settlement-dialog', 'records-customers', 'records-insurance',
  'records-history', 'profile-sync', 'offline-readonly', 'states-gallery',
];

test('mobile UI catalog contains every approved screen exactly once', () => {
  assert.equal(SCREEN_CATALOG.length, 22);
  assert.deepEqual([...new Set(SCREEN_CATALOG.map(({ id }) => id))], required);
});

test('every catalog entry has review metadata', () => {
  for (const screen of SCREEN_CATALOG) {
    assert.match(screen.label, /\S/);
    assert.ok(['auth', 'workbench', 'orders', 'forms', 'records', 'system'].includes(screen.group));
    assert.ok(['all', 'employee', 'admin'].includes(screen.role));
  }
});
```

- [ ] **Step 2: Run the catalog test and verify it fails**

Run: `node --test design/mobile-ui/tests/catalog.test.mjs`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `screen-catalog.js`.

- [ ] **Step 3: Install visual-prototype dependencies**

Run: `npm.cmd install --save-dev @playwright/test lucide-react`
Expected: `package.json` and `package-lock.json` include both dev dependencies.

Run: `npx.cmd playwright install chromium`
Expected: Chromium installation completes without an error.

- [ ] **Step 4: Add prototype scripts**

Add these exact scripts to `package.json`:

```json
{
  "design:mobile": "vite design/mobile-ui --host 127.0.0.1 --port 4175",
  "design:mobile:capture": "playwright test -c design/mobile-ui/playwright.config.mjs capture.spec.mjs",
  "test:mobile-ui": "playwright test -c design/mobile-ui/playwright.config.mjs"
}
```

- [ ] **Step 5: Implement the complete 22-screen catalog**

```js
// design/mobile-ui/src/screen-catalog.js
export const SCREEN_CATALOG = [
  ['login-company', '登录与公司选择', 'auth', 'all'],
  ['workbench-employee', '员工工作台', 'workbench', 'employee'],
  ['workbench-admin', '管理员工作台', 'workbench', 'admin'],
  ['orders-current', '当前工单', 'orders', 'all'],
  ['orders-filter-sheet', '工单筛选', 'orders', 'all'],
  ['order-detail-employee', '员工工单详情', 'orders', 'employee'],
  ['order-detail-admin', '管理员工单详情', 'orders', 'admin'],
  ['order-create-customer', '新增工单：客户车辆', 'forms', 'all'],
  ['order-create-insurance', '新增工单：保险事故', 'forms', 'all'],
  ['order-create-repair', '新增工单：维修费用', 'forms', 'all'],
  ['order-create-review', '新增工单：确认提交', 'forms', 'all'],
  ['order-edit', '编辑工单', 'forms', 'all'],
  ['order-status-dialog', '状态确认', 'orders', 'all'],
  ['order-settlement', '结算工单', 'orders', 'admin'],
  ['receipt-upload', '到账回执', 'orders', 'admin'],
  ['reverse-settlement-dialog', '返结算确认', 'orders', 'admin'],
  ['records-customers', '客户车辆档案', 'records', 'all'],
  ['records-insurance', '车辆保险档案', 'records', 'all'],
  ['records-history', '维修历史', 'records', 'all'],
  ['profile-sync', '我的与同步状态', 'system', 'all'],
  ['offline-readonly', '离线只读', 'system', 'all'],
  ['states-gallery', '系统状态合集', 'system', 'all'],
].map(([id, label, group, role]) => ({ id, label, group, role }));
```

- [ ] **Step 6: Create the Vite entry and token foundation**

`index.html` contains only `#root` and `/src/main.jsx`. `main.jsx` reads `screen` from `URLSearchParams`, resolves the registry, and displays an explicit unknown-screen state when the id is invalid.

```jsx
const screenId = new URLSearchParams(location.search).get('screen') ?? SCREEN_CATALOG[0].id;
const Screen = SCREEN_REGISTRY[screenId];
createRoot(document.getElementById('root')).render(
  <StrictMode>{Screen ? <Screen /> : <UnknownScreen id={screenId} />}</StrictMode>,
);
```

Define every approved token as a CSS custom property in `tokens.css`, including safe-area variables and the 360/412/768 responsive breakpoints. Set `overflow-x: hidden` only on the phone shell; tests must still detect children that exceed its width.

- [ ] **Step 7: Add Playwright configuration**

```js
// design/mobile-ui/playwright.config.mjs
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  use: {
    baseURL: 'http://127.0.0.1:4175',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    colorScheme: 'light',
    reducedMotion: 'reduce',
  },
  webServer: {
    command: 'npm.cmd run design:mobile',
    url: 'http://127.0.0.1:4175',
    reuseExistingServer: true,
    timeout: 120000,
  },
});
```

- [ ] **Step 8: Run the contract test and production build**

Run: `node --test design/mobile-ui/tests/catalog.test.mjs`
Expected: 2 tests pass.

Run: `npm.cmd run build`
Expected: existing production Vite build still succeeds; the isolated prototype does not alter the production entry.

- [ ] **Step 9: Commit the prototype contract**

```bash
git add package.json package-lock.json design/mobile-ui
git commit -m "design: establish Android UI atlas harness"
```

---

### Task 2: Build Shared Mobile Primitives and Authentication Screens

**Files:**
- Create: `design/mobile-ui/src/mock-data.js`
- Create: `design/mobile-ui/src/components/MobileShell.jsx`
- Create: `design/mobile-ui/src/components/BottomNav.jsx`
- Create: `design/mobile-ui/src/components/StatusPill.jsx`
- Create: `design/mobile-ui/src/components/MetricCard.jsx`
- Create: `design/mobile-ui/src/components/FormControls.jsx`
- Create: `design/mobile-ui/src/screens/AuthScreens.jsx`
- Create: `design/mobile-ui/src/screens/registry.jsx`
- Modify: `design/mobile-ui/src/app.css`
- Create: `design/mobile-ui/tests/visual.spec.mjs`

**Interfaces:**
- Produces: reusable mobile shell, navigation, status, metric, and form components.
- Produces: `LoginCompanyScreen` and initial `SCREEN_REGISTRY` entry.
- Consumes: token variables and catalog ids from Task 1.

- [ ] **Step 1: Write failing shell and login tests**

```js
// design/mobile-ui/tests/visual.spec.mjs
import { test, expect } from '@playwright/test';

test('login screen exposes company choice and credentials', async ({ page }) => {
  await page.goto('/?screen=login-company');
  await expect(page.getByRole('heading', { name: '选择门店' })).toBeVisible();
  await expect(page.getByText('通达汽车服务中心')).toBeVisible();
  await expect(page.getByText('鑫齐恒汽车服务中心')).toBeVisible();
  await expect(page.getByLabel('账号')).toBeVisible();
  await expect(page.getByLabel('密码')).toBeVisible();
  await expect(page.getByRole('button', { name: '进入系统' })).toBeVisible();
});

test('phone shell has no horizontal overflow', async ({ page }) => {
  await page.goto('/?screen=login-company');
  const widths = await page.locator('[data-mobile-shell]').evaluate((node) => ({
    client: node.clientWidth,
    scroll: node.scrollWidth,
  }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.client);
});
```

- [ ] **Step 2: Run the visual test and verify it fails**

Run: `npm.cmd run test:mobile-ui -- --grep "login screen|phone shell"`
Expected: FAIL because the screen registry and login UI are not implemented.

- [ ] **Step 3: Add fixed sample data**

```js
export const companies = [
  { shortName: '通达汽车服务中心', fullName: '鄂尔多斯市通达汽车服务有限公司' },
  { shortName: '鑫齐恒汽车服务中心', fullName: '鄂尔多斯市鑫齐恒汽车服务有限公司' },
];

export const sampleOrder = {
  orderNo: 'RO202607150018',
  plate: '蒙K·A3816',
  customer: '张先生',
  phone: '138****7216',
  model: '丰田 凯美瑞',
  vin: 'LVGBM51K8NG062816',
  insurer: '人保财险',
  expiryDate: '2026-12-28',
  claimNo: 'PIC20260715018',
  accidentType: '钣喷维修（有换件）',
  repairContent: '右前翼子板钣金喷漆，更换右前大灯',
  laborFee: 680,
  materialFee: 2360,
  total: 3040,
  staff: '张工',
};
```

- [ ] **Step 4: Implement shell and component primitives**

`MobileShell` must render a semantic header, scrollable main region, optional offline strip, and fixed bottom navigation. `BottomNav` uses Lucide `LayoutDashboard`, `ClipboardList`, `Plus`, `FolderSearch`, and `UserRound` icons. The center Add action is a circular blue icon button with a visible `新增` label below it.

`FormControls.jsx` exports visual controls with real `<label>` and form elements so Playwright can query accessible names. Inputs use requirement-oriented placeholders such as `必填，请输入车牌号`, never stored-looking sample values as placeholders.

- [ ] **Step 5: Implement login and company selection**

Render a quiet white screen with a compact product title, two company selection rows, labeled account/password controls, a primary login button, and a small network-security note. Do not show access-code hints or a logo illustration.

- [ ] **Step 6: Run focused visual tests**

Run: `npm.cmd run test:mobile-ui -- --grep "login screen|phone shell"`
Expected: 2 tests pass.

- [ ] **Step 7: Capture and inspect login at three phone widths**

Add this test to `design/mobile-ui/tests/visual.spec.mjs`:

```js
for (const viewport of [
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
]) {
  test(`login responsive at ${viewport.width}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/?screen=login-company');
    const shell = page.locator('[data-mobile-shell]');
    const widths = await shell.evaluate((node) => ({
      client: node.clientWidth,
      scroll: node.scrollWidth,
    }));
    expect(widths.scroll).toBeLessThanOrEqual(widths.client);
    await expect(page.getByRole('button', { name: '进入系统' })).toBeInViewport();
  });
}
```

Run: `npm.cmd run test:mobile-ui -- --grep "login responsive"`
Expected: each viewport reports `scrollWidth <= clientWidth` and all primary controls remain visible.

- [ ] **Step 8: Commit shared visual foundations**

```bash
git add design/mobile-ui
git commit -m "design: add mobile shell and authentication screens"
```

---

### Task 3: Build Employee and Administrator Workbenches

**Files:**
- Create: `design/mobile-ui/src/components/OrderCard.jsx`
- Create: `design/mobile-ui/src/screens/WorkbenchScreens.jsx`
- Modify: `design/mobile-ui/src/screens/registry.jsx`
- Modify: `design/mobile-ui/src/mock-data.js`
- Modify: `design/mobile-ui/src/app.css`
- Modify: `design/mobile-ui/tests/visual.spec.mjs`

**Interfaces:**
- Produces: `EmployeeWorkbenchScreen` and `AdminWorkbenchScreen`.
- Produces: `OrderCard({ order, compact, onOpenLabel })` for later order and record screens.
- Consumes: shell, navigation, status, and metric primitives from Task 2.

- [ ] **Step 1: Write failing workbench tests**

```js
test('employee workbench prioritizes operational tasks without settlement controls', async ({ page }) => {
  await page.goto('/?screen=workbench-employee');
  await expect(page.getByRole('heading', { name: '今日工作' })).toBeVisible();
  await expect(page.getByText('在修')).toBeVisible();
  await expect(page.getByText('待结算')).toBeVisible();
  await expect(page.getByText('保险到期')).toBeVisible();
  await expect(page.getByRole('button', { name: '办理结算' })).toHaveCount(0);
});

test('administrator workbench adds business summary and settlement entry', async ({ page }) => {
  await page.goto('/?screen=workbench-admin');
  await expect(page.getByText('本月产值')).toBeVisible();
  await expect(page.getByRole('button', { name: '办理结算' })).toBeVisible();
});
```

- [ ] **Step 2: Run tests and verify they fail**

Run: `npm.cmd run test:mobile-ui -- --grep "workbench"`
Expected: FAIL because workbench screens are absent.

- [ ] **Step 3: Implement the four-state summary and priority list**

Use one full-width state band split into four equal status actions, followed by two metric cards per row and a single unframed priority list. Status actions show value, label, and destination cue. Avoid placing cards inside the state band.

- [ ] **Step 4: Implement role-specific workbench content**

Employee content ends with `我的待办`. Administrator content adds `经营摘要` and a visible `办理结算` command on the awaiting-settlement task. Keep both screens structurally aligned so role changes do not move navigation.

- [ ] **Step 5: Run workbench tests and responsive checks**

Run: `npm.cmd run test:mobile-ui -- --grep "workbench"`
Expected: both role tests pass and no horizontal overflow is reported at 360 and 412 widths.

- [ ] **Step 6: Commit workbench screens**

```bash
git add design/mobile-ui
git commit -m "design: add role-aware mobile workbenches"
```

---

### Task 4: Build Work-Order Lists, Details, and Role Actions

**Files:**
- Create: `design/mobile-ui/src/components/Overlays.jsx`
- Create: `design/mobile-ui/src/screens/OrderScreens.jsx`
- Modify: `design/mobile-ui/src/screens/registry.jsx`
- Modify: `design/mobile-ui/src/mock-data.js`
- Modify: `design/mobile-ui/src/app.css`
- Modify: `design/mobile-ui/tests/visual.spec.mjs`

**Interfaces:**
- Produces: list, filter, employee detail, administrator detail, status dialog, settlement, receipt, and reverse-settlement screens.
- Produces: `BottomSheet`, `FullScreenModal`, and `ConfirmDialog` primitives.
- Consumes: `OrderCard`, `StatusPill`, fixed sample orders, and role rules.

- [ ] **Step 1: Write failing role-action and overlay tests**

```js
test('employee order detail can update progress but cannot settle', async ({ page }) => {
  await page.goto('/?screen=order-detail-employee');
  await expect(page.getByRole('button', { name: '切换为在修' })).toBeVisible();
  await expect(page.getByRole('button', { name: '切换为完工' })).toBeVisible();
  await expect(page.getByRole('button', { name: '标记待结算' })).toBeVisible();
  await expect(page.getByRole('button', { name: '完成结算' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '返结算' })).toHaveCount(0);
});

test('administrator order detail exposes settlement actions', async ({ page }) => {
  await page.goto('/?screen=order-detail-admin');
  await expect(page.getByRole('button', { name: '完成结算' })).toBeVisible();
  await expect(page.getByRole('button', { name: '作废工单' })).toBeVisible();
});

test('filter is a bottom sheet and reverse settlement is destructive', async ({ page }) => {
  await page.goto('/?screen=orders-filter-sheet');
  await expect(page.locator('[data-overlay="bottom-sheet"]')).toBeVisible();
  await page.goto('/?screen=reverse-settlement-dialog');
  await expect(page.locator('[data-tone="danger"]')).toBeVisible();
});
```

- [ ] **Step 2: Run tests and verify they fail**

Run: `npm.cmd run test:mobile-ui -- --grep "order detail|bottom sheet|reverse settlement"`
Expected: FAIL because order and overlay screens are absent.

- [ ] **Step 3: Implement current-order list and filter sheet**

Use a sticky segmented control for All, In Repair, Completed, and Awaiting Settlement. Render vertically stacked order cards with plate and status in the first row, customer and phone in the second, repair summary in the third, and amount plus update time in the footer. The filter sheet contains staff, insurer, date, vehicle type, and status groups with `重置` and `应用筛选` actions.

- [ ] **Step 4: Implement detail screens and status timeline**

The detail screen order is: status header, vehicle/customer summary, status timeline, repair content, insurance/accident data, cost summary, notes, then fixed action footer. Employee and administrator screens share content and differ only in the footer action set.

- [ ] **Step 5: Implement settlement and receipt states**

The settlement screen shows labor, material, total, payment method, note, and required receipt section. The receipt screen shows a realistic image placeholder frame with file metadata, Replace, Delete, and Confirm controls. A red inline message states that settlement cannot complete until upload succeeds.

- [ ] **Step 6: Implement status and reverse-settlement confirmation dialogs**

Status confirmation uses neutral primary styling and explicitly names the destination state. Reverse settlement uses danger styling, explains that the order returns to Awaiting Settlement, and labels the primary action `确认返结算`.

- [ ] **Step 7: Run order and overlay tests**

Run: `npm.cmd run test:mobile-ui -- --grep "order detail|bottom sheet|reverse settlement"`
Expected: all focused tests pass.

- [ ] **Step 8: Commit order and settlement screens**

```bash
git add design/mobile-ui
git commit -m "design: add mobile order and settlement flows"
```

---

### Task 5: Build the Four-Step Create Flow and Edit State

**Files:**
- Create: `design/mobile-ui/src/screens/OrderFormScreens.jsx`
- Modify: `design/mobile-ui/src/screens/registry.jsx`
- Modify: `design/mobile-ui/src/app.css`
- Modify: `design/mobile-ui/tests/visual.spec.mjs`

**Interfaces:**
- Produces: four create-step screens and the edit screen.
- Consumes: `FullScreenModal`, form controls, sample order, companies, insurers, staff, accident types, and vehicle types.

- [ ] **Step 1: Write failing form-flow tests**

```js
test('create flow exposes the correct fields and progress for every step', async ({ page }) => {
  const steps = [
    ['order-create-customer', '1 / 4', '客户与车辆'],
    ['order-create-insurance', '2 / 4', '保险与事故'],
    ['order-create-repair', '3 / 4', '维修与费用'],
    ['order-create-review', '4 / 4', '确认并提交'],
  ];
  for (const [id, progress, heading] of steps) {
    await page.goto(`/?screen=${id}`);
    await expect(page.getByText(progress)).toBeVisible();
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
  }
});

test('insurance expiry is required and entry date is locked', async ({ page }) => {
  await page.goto('/?screen=order-create-insurance');
  await expect(page.getByLabel('保险到期日（必填）')).toBeVisible();
  await page.goto('/?screen=order-create-repair');
  await expect(page.getByLabel('进厂日期')).toBeDisabled();
  await expect(page.getByLabel('进厂时间')).toBeEnabled();
});
```

- [ ] **Step 2: Run tests and verify they fail**

Run: `npm.cmd run test:mobile-ui -- --grep "create flow|insurance expiry"`
Expected: FAIL because form screens are absent.

- [ ] **Step 3: Implement shared full-screen form layout**

Each step includes a fixed title bar, `N / 4` progress, one unframed form section, and a fixed bottom action area. Use two columns only on tablet; phones always use one column. Back and Continue remain in stable positions.

- [ ] **Step 4: Implement each form step and review screen**

Step 1 contains customer, phone, plate, model, and VIN. Step 2 contains insurer, required expiry date, claim number, vehicle type, and accident type. Step 3 contains repair content, labor, material, payment method, staff, locked entry date, and editable entry time. Step 4 groups entered values into Customer Vehicle, Insurance Accident, and Repair Fees summaries without nesting cards.

- [ ] **Step 5: Implement edit state**

Reuse the form layout with title `编辑工单`, prefilled values, a visible order number, and `保存修改` as the primary action. Do not show a four-step progress indicator in edit mode; use section tabs for Customer Vehicle, Insurance Accident, and Repair Fees.

- [ ] **Step 6: Run form tests and small-phone overflow checks**

Run: `npm.cmd run test:mobile-ui -- --grep "create flow|insurance expiry|small phone form"`
Expected: all focused tests pass; 360 x 800 has no horizontal overflow.

- [ ] **Step 7: Commit form screens**

```bash
git add design/mobile-ui
git commit -m "design: add mobile work-order form flow"
```

---

### Task 6: Build Records, Profile, Offline, and System States

**Files:**
- Create: `design/mobile-ui/src/components/StatePanel.jsx`
- Create: `design/mobile-ui/src/screens/RecordScreens.jsx`
- Create: `design/mobile-ui/src/screens/ProfileScreens.jsx`
- Modify: `design/mobile-ui/src/screens/registry.jsx`
- Modify: `design/mobile-ui/src/mock-data.js`
- Modify: `design/mobile-ui/src/app.css`
- Modify: `design/mobile-ui/tests/visual.spec.mjs`

**Interfaces:**
- Produces: customer, insurance, history, profile, offline, and state-gallery screens.
- Produces: reusable state panels for future Android implementation reference.
- Consumes: shell, navigation, order card, status pill, and fixed sample records.

- [ ] **Step 1: Write failing record and offline tests**

```js
test('records separate customer, insurance, and settled history responsibilities', async ({ page }) => {
  await page.goto('/?screen=records-customers');
  await expect(page.getByText('维修记录 2 单')).toBeVisible();
  await page.goto('/?screen=records-insurance');
  await expect(page.getByText('保险到期')).toBeVisible();
  await page.goto('/?screen=records-history');
  await expect(page.getByText('已结算')).toBeVisible();
  await expect(page.getByText('在修中')).toHaveCount(0);
});

test('offline state is read-only and explains unavailable actions', async ({ page }) => {
  await page.goto('/?screen=offline-readonly');
  await expect(page.getByText('网络不可用')).toBeVisible();
  await expect(page.getByText('当前为只读模式')).toBeVisible();
  await expect(page.getByRole('button', { name: '新增工单' })).toBeDisabled();
});
```

- [ ] **Step 2: Run tests and verify they fail**

Run: `npm.cmd run test:mobile-ui -- --grep "records separate|offline state"`
Expected: FAIL because record and system screens are absent.

- [ ] **Step 3: Implement three record screens**

Use a shared top segmented control and a single vertical result list. Customer cards emphasize plate and customer; insurance cards emphasize insurer, expiry, and remaining days; history cards emphasize settlement status, amount, time, and receipt availability.

- [ ] **Step 4: Implement profile and synchronization screen**

Show account, role, active company, network state, last successful sync, app version, update check, privacy, cache, and sign out. Do not include settings administration, dictionaries, logs, or export.

- [ ] **Step 5: Implement offline and state gallery**

Offline uses a fixed warning strip and disables mutation controls while leaving cached cards readable. The state gallery displays loading skeleton, useful empty state, retryable cloud error, and permission-denied state as separate unframed sections.

- [ ] **Step 6: Run record and offline tests**

Run: `npm.cmd run test:mobile-ui -- --grep "records separate|offline state"`
Expected: all focused tests pass.

- [ ] **Step 7: Commit records and system states**

```bash
git add design/mobile-ui
git commit -m "design: add mobile records and system states"
```

---

### Task 7: Capture PNGs, Build Atlas Boards, and Complete Visual QA

**Files:**
- Create: `design/mobile-ui/src/components/AtlasBoard.jsx`
- Modify: `design/mobile-ui/src/main.jsx`
- Create: `design/mobile-ui/tests/capture.spec.mjs`
- Modify: `design/mobile-ui/tests/visual.spec.mjs`
- Create: `design/mobile-ui/output/*.png`
- Create: `docs/mobile-ui-atlas.md`
- Modify: `.gitignore` only if the existing rules exclude intended PNG outputs

**Interfaces:**
- Produces: one deterministic PNG per `SCREEN_CATALOG` entry.
- Produces: four overview boards grouped as Auth/Workbench, Orders, Forms, Records/System.
- Consumes: complete registry and Playwright configuration.

- [ ] **Step 1: Write the capture contract**

```js
// design/mobile-ui/tests/capture.spec.mjs
import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCREEN_CATALOG } from '../src/screen-catalog.js';

const output = fileURLToPath(new URL('../output/', import.meta.url));

test.beforeAll(async () => mkdir(output, { recursive: true }));

for (const screen of SCREEN_CATALOG) {
  test(`capture ${screen.id}`, async ({ page }) => {
    await page.goto(`/?screen=${screen.id}`);
    await expect(page.locator('[data-screen-id]')).toHaveAttribute('data-screen-id', screen.id);
    await page.screenshot({
      path: join(output, `${screen.id}.png`),
      fullPage: false,
      animations: 'disabled',
    });
  });
}
```

- [ ] **Step 2: Expand cross-viewport QA**

Add a loop over 360 x 800, 412 x 915, and 768 x 1024 for `workbench-employee`, `orders-current`, `order-create-insurance`, and `records-history`. For each screen assert:

```js
const overflow = await page.locator('[data-mobile-shell]').evaluate((node) => ({
  clientWidth: node.clientWidth,
  scrollWidth: node.scrollWidth,
}));
expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
await expect(page.locator('[data-primary-action]')).toBeInViewport();
```

- [ ] **Step 3: Run the complete visual test suite**

Run: `npm.cmd run test:mobile-ui -- --grep-invert "capture"`
Expected: all catalog, role, field, overlay, offline, and responsive assertions pass.

- [ ] **Step 4: Capture all approved screens**

Run: `npm.cmd run design:mobile:capture`
Expected: 22 passing capture tests and 22 PNG files in `design/mobile-ui/output/`.

- [ ] **Step 5: Build four overview atlas boards**

Create `AtlasBoard.jsx` with four explicit groups. It renders each screen in a labeled 390 x 844 phone frame and uses the same registry as the individual previews:

```jsx
import { SCREEN_CATALOG } from '../screen-catalog.js';
import { SCREEN_REGISTRY } from '../screens/registry.jsx';

export const ATLAS_GROUPS = {
  'auth-workbench': ['login-company', 'workbench-employee', 'workbench-admin'],
  'orders-overlays': [
    'orders-current', 'orders-filter-sheet', 'order-detail-employee',
    'order-detail-admin', 'order-status-dialog', 'order-settlement',
    'receipt-upload', 'reverse-settlement-dialog',
  ],
  'create-edit-flow': [
    'order-create-customer', 'order-create-insurance', 'order-create-repair',
    'order-create-review', 'order-edit',
  ],
  'records-system': [
    'records-customers', 'records-insurance', 'records-history',
    'profile-sync', 'offline-readonly', 'states-gallery',
  ],
};

export function AtlasBoard({ group }) {
  const ids = ATLAS_GROUPS[group] ?? [];
  return (
    <main className="atlas-board" data-atlas-group={group}>
      {ids.map((id) => {
        const meta = SCREEN_CATALOG.find((screen) => screen.id === id);
        const Screen = SCREEN_REGISTRY[id];
        return (
          <figure className="atlas-frame" key={id}>
            <figcaption>{meta.label} · {meta.role}</figcaption>
            <div className="atlas-phone"><Screen /></div>
          </figure>
        );
      })}
    </main>
  );
}
```

Update `main.jsx` so `?atlas=<group>` renders `AtlasBoard`; otherwise it keeps rendering `?screen=<id>`. Extend `capture.spec.mjs` with these exact outputs:

```js
const atlasFiles = {
  'auth-workbench': 'atlas-01-auth-workbench.png',
  'orders-overlays': 'atlas-02-orders-overlays.png',
  'create-edit-flow': 'atlas-03-create-edit-flow.png',
  'records-system': 'atlas-04-records-system.png',
};

for (const [group, file] of Object.entries(atlasFiles)) {
  test(`atlas ${group}`, async ({ page }) => {
    await page.setViewportSize({ width: 1680, height: 1200 });
    await page.goto(`/?atlas=${group}`);
    await expect(page.locator('[data-atlas-group]')).toHaveAttribute('data-atlas-group', group);
    await page.screenshot({
      path: join(output, file),
      fullPage: true,
      animations: 'disabled',
    });
  });
}
```

The generated files are:

```text
atlas-01-auth-workbench.png
atlas-02-orders-overlays.png
atlas-03-create-edit-flow.png
atlas-04-records-system.png
```

Each board labels every phone frame with the Chinese screen name and role. The boards are review aids; individual PNGs remain the implementation reference.

- [ ] **Step 6: Perform manual visual inspection**

Inspect every atlas and at least these individual files with `view_image` at original detail:

```text
workbench-employee.png
orders-current.png
order-detail-admin.png
order-create-insurance.png
order-settlement.png
records-history.png
offline-readonly.png
```

Reject the output if text overlaps, buttons clip, any screen scrolls horizontally, status relies only on color, the center Add action shifts navigation, or overlays fail to cover the underlying interaction area.

- [ ] **Step 7: Document the atlas**

`docs/mobile-ui-atlas.md` must include:

- Links to all four atlas boards.
- A table mapping all 22 ids to Chinese names, roles, and PNG files.
- Commands to run the prototype, tests, and capture process.
- A note that the prototype is fixed-data design material, not the Android production client.
- The approved visual tokens and permission distinctions.

- [ ] **Step 8: Run final repository verification**

Run: `node --test design/mobile-ui/tests/catalog.test.mjs`
Expected: 2 tests pass.

Run: `npm.cmd run test:mobile-ui`
Expected: all Playwright tests pass.

Run: `npm.cmd test`
Expected: the existing application test suite passes.

Run: `npm.cmd run build`
Expected: the production build succeeds.

Run: `git -c safe.directory=E:/codex/chengxu diff --check`
Expected: no whitespace errors.

- [ ] **Step 9: Commit and push the completed atlas**

```bash
git add package.json package-lock.json design/mobile-ui docs/mobile-ui-atlas.md
git commit -m "design: add complete Android mobile UI atlas"
git push origin main
```

## Completion Checklist

- [ ] Exactly 22 individual PNG screen files are present.
- [ ] Four labeled overview atlas boards are present.
- [ ] Every catalog id maps to a rendered React screen.
- [ ] Employee screens omit settlement, reverse-settlement, void, and receipt mutation actions.
- [ ] Administrator screens show the approved privileged actions.
- [ ] All four form steps, edit mode, and required insurance-expiry field are visible.
- [ ] Settled history, receipt, offline read-only, loading, empty, error, and permission states are represented.
- [ ] No phone viewport has horizontal overflow or incoherent overlap.
- [ ] Production tests and build remain green.
