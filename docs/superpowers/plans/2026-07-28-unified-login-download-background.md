# 智纬统一登录与客户端下载呈现实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 统一网页和 Windows 客户端登录呈现，将 Android 二维码收纳到客户端下载弹窗，并使用一张新的低干扰品牌背景图。

**Architecture:** `AccessGate` 只保留登录和打开下载弹窗的职责；`ClientDownloadsDialog` 复用现有发布元数据并为 Android 卡片生成本地二维码。新背景图放在 `public/brand/`，由登录 CSS 使用，不改变 API 或业务状态。

**Tech Stack:** React、Vite、Tauri、CSS、qrcode.react、Image Generation。

## Global Constraints

- 网页和 Windows 共享 `AccessGate`，可见品牌固定为“智纬”。
- 仅在可用 HTTPS Android 发布地址时显示二维码，且二维码仅位于客户端下载弹窗。
- 无 D1/Room migration、无业务接口或权限变更、不部署 Pages。
- 每个任务更新 `docs/latest-handoff-prompt.md`、提交并推送。

---

### Task 1: 背景图资产与登录 CSS

**Files:**
- Create: `public/brand/zhiwei-login-background.png`
- Modify: `src/styles.css`
- Test: `test/zhiweiBrand.test.mjs`

- [ ] **Step 1: Write the failing asset contract**

```js
assert.ok(readFileSync('public/brand/zhiwei-login-background.png').length > 10_000);
assert.match(readFileSync('src/styles.css', 'utf8'), /zhiwei-login-background\.png/);
```

- [ ] **Step 2: Run the contract and verify RED**

Run: `npm.cmd test -- --test-name-pattern="智纬 visible brand"`

Expected: FAIL because the asset and CSS reference do not exist.

- [ ] **Step 3: Generate and install the background asset**

Generate a text-free pale ice-blue abstract vehicle-maintenance line illustration; install it at the exact path and apply it only to the login page background with responsive opacity reduction.

- [ ] **Step 4: Run the contract and commit**

Run: `npm.cmd test -- --test-name-pattern="智纬 visible brand"`

Commit: `git add public/brand/zhiwei-login-background.png src/styles.css test/zhiweiBrand.test.mjs; git commit -m "feat(login): add shared brand background"`

### Task 2: 将 Android 二维码收纳到下载弹窗

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/ClientDownloadsDialog.jsx`
- Delete: `src/components/AndroidInstallQr.jsx`
- Modify: `src/styles.css`
- Test: `test/androidInstallQr.test.mjs`

- [ ] **Step 1: Write failing modal-only QR assertions**

```js
assert.doesNotMatch(readFileSync('src/App.jsx', 'utf8'), /AndroidInstallQr/);
assert.match(readFileSync('src/components/ClientDownloadsDialog.jsx', 'utf8'), /QRCodeSVG/);
assert.match(readFileSync('src/components/ClientDownloadsDialog.jsx', 'utf8'), /release\.canDownload/);
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm.cmd test -- --test-name-pattern="Android QR"`

Expected: FAIL because the QR component remains outside the dialog.

- [ ] **Step 3: Implement one Android card QR path**

Remove the external QR import/rendering, add `QRCodeSVG` inside the Android download card only when `release.canDownload`, use `release.downloadUrl` for the QR and existing external-download action, and retain published/loading/error states.

- [ ] **Step 4: Run focused tests and commit**

Run: `npm.cmd test -- --test-name-pattern="Android QR"`

Commit: `git add src/App.jsx src/components/ClientDownloadsDialog.jsx src/components/AndroidInstallQr.jsx src/styles.css test/androidInstallQr.test.mjs; git commit -m "feat(login): move android qr into download dialog"`

### Task 3: 跨端一致性与构建验证

**Files:**
- Modify: `docs/latest-handoff-prompt.md`

- [ ] **Step 1: Verify visual contracts and builds**

Run: `npm.cmd test` then `npm.cmd run build`.

Expected: all Node tests pass and Vite build succeeds.

- [ ] **Step 2: Check Tauri visible-name and source contract**

Run: `rg -n "智纬|AndroidInstallQr|zhiwei-login-background" src src-tauri public`.

Expected: `智纬` remains visible in shared login sources, no `AndroidInstallQr` source exists, and background asset is referenced.

- [ ] **Step 3: Update handoff, commit and push**

Commit: `git add docs/latest-handoff-prompt.md; git commit -m "docs: record unified login presentation"`

Push: `git push origin codex/android-mobile-ui-atlas`
