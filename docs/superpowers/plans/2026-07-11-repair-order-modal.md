# Repair Order Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the persistent repair-order side editor with explicit create, detail, and edit modals that never reopen after being closed or after page navigation.

**Architecture:** `RepairReception` keeps the selected row only for table highlighting, while a small modal-state helper owns the currently open modal and its target order id. The main table becomes full-width; create and edit use one scrollable work-order modal, and detail, settlement, confirmation, and void dialogs remain layered overlays.

**Tech Stack:** React 19, Vite, CSS, Node built-in test runner.

## Global Constraints

- Preserve all existing work-order fields, auto-generated archives, settlement receipt flow, and permission checks.
- Closing a dialog must clear modal state; selecting a row must not open any dialog.
- Maintain the existing light technology visual system, 8px-or-smaller radii, and fixed action footer inside long forms.
- Keep the main work-order table visible without a permanent right-side editor.

---

### Task 1: Define and verify modal lifecycle state

**Files:**
- Create: `src/repairModalState.js`
- Create: `test/repairModalState.test.mjs`

**Interfaces:**
- Produces: `closedRepairModalState()`, returning `{ kind: 'closed', orderId: '' }`.
- Produces: `openRepairModal(kind, orderId?)`, returning `{ kind, orderId }`.

- [ ] **Step 1: Write the failing test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { closedRepairModalState, openRepairModal } from '../src/repairModalState.js';

test('closing a repair modal clears its order target', () => {
  assert.deepEqual(closedRepairModalState(), { kind: 'closed', orderId: '' });
});

test('row selection alone has no modal-open state', () => {
  assert.equal(openRepairModal('detail', 'RO1').kind, 'detail');
  assert.deepEqual(closedRepairModalState(), { kind: 'closed', orderId: '' });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/repairModalState.test.mjs`
Expected: FAIL because `src/repairModalState.js` does not exist.

- [ ] **Step 3: Implement the minimal modal state helper**

```js
export function closedRepairModalState() {
  return { kind: 'closed', orderId: '' };
}

export function openRepairModal(kind, orderId = '') {
  return { kind, orderId };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/repairModalState.test.mjs`
Expected: PASS.

### Task 2: Convert repair order entry and edit to modal workflow

**Files:**
- Modify: `src/App.jsx:1773-2100`
- Modify: `src/App.jsx:2496-2660`

**Interfaces:**
- Consumes: `closedRepairModalState`, `openRepairModal` from `src/repairModalState.js`.
- Produces: `WorkOrderFormDialog`, which renders `OrderForm` in a scrollable modal and closes to a fully cleared modal state.

- [ ] **Step 1: Replace side-panel form state with explicit modal state**

Keep `selectedId` for row highlighting only. Open `create`, `edit`, and `detail` exclusively through `openRepairModal`; close all three through `closedRepairModalState`.

- [ ] **Step 2: Render a full-width table panel**

Remove the permanent `.detail-panel` from the repair page. The table row handler only selects the row; its View action opens the detail modal and its Edit action opens the form modal.

- [ ] **Step 3: Add a shared form dialog**

Wrap `OrderForm` in `WorkOrderFormDialog` with a fixed header, independently scrollable body, sticky footer actions, keyboard Escape close, and responsive near-fullscreen mobile layout.

- [ ] **Step 4: Preserve status, settlement, receipt, and void flows**

After saving, close the form modal and leave the saved row selected. Settlement, confirmation, void, printing, and receipt dialogs continue to layer above the detail dialog without reopening closed dialogs.

### Task 3: Style and verify the modal experience

**Files:**
- Modify: `src/styles.css:1494-1700`
- Modify: `src/styles.css:2052-2140`

- [ ] **Step 1: Add work-order modal layout styles**

Use a 980px desktop dialog with a scrollable form body, header/footer separation, and 8px radius. Keep action buttons fixed while fields scroll.

- [ ] **Step 2: Remove obsolete split-view and detail-panel dependence from repair layout**

Keep legacy styles only when still used elsewhere; do not let the repair page retain an empty right column.

- [ ] **Step 3: Run behavior and build verification**

Run:

```powershell
node --test test/repairModalState.test.mjs
npm.cmd run build
```

Expected: test PASS and Vite production build succeeds.

- [ ] **Step 4: Commit and push**

```powershell
git -c safe.directory=E:/codex/chengxu add src/App.jsx src/styles.css src/repairModalState.js test/repairModalState.test.mjs docs/superpowers/plans/2026-07-11-repair-order-modal.md
git -c safe.directory=E:/codex/chengxu commit -m "feat: move repair order form into modal"
```
