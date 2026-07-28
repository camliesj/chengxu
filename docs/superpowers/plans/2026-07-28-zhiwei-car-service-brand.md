# 智维车服跨端品牌 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为“智维车服”产出一枚可识别、可缩放的图标，并在用户确认预览后将统一名称和图标落实到网页、Windows 桌面端与 Android。

**Architecture:** 首先只生成一张 1024×1024 的视觉预览，不改动产品资源；预览获批后，将同一主图作为唯一源资产，按各终端的图标清单生成派生尺寸。名称修改只影响用户可见的标题和应用标签，不更改包名、Tauri identifier、存储键、数据库名或 API 路径。

**Tech Stack:** ImageGen、Vite/React、Tauri 2 打包图标、Android XML/PNG 资源、Gradle。

## Global Constraints

- 产品统一名称为“智维车服”。
- 图标为深石墨圆角方形底、抽象 W 服务路径结构、冰蓝点缀；无文字、无渐变、无写实车辆、无复杂工具图形。
- 用户确认预览前，不替换任何正式应用图标或产品名称。
- 必须保留 `com.chengxu.autoservice`、`com.chengxu.repairmanager`、`chengxu-*` 存储键和现有数据库标识，避免破坏已安装客户端、会话和数据。
- 当前会话内联执行，不使用子代理；不部署 Pages/D1。
- 每一轮资源/名称修改后，更新 `docs/latest-handoff-prompt.md`、提交 Git 并推送当前分支。

---

### Task 1: 生成并评审图标预览

**Files:**
- Create after generation approval: `docs/superpowers/specs/2026-07-28-zhiwei-car-service-brand-design.md` (only if visual decisions need an approved addendum)

- [ ] **Step 1: Generate a single 1024×1024 square preview.**
  - Use the confirmed brief: deep graphite rounded-square field; a centered geometric W formed by two continuous service-road strokes; a small ice-blue diagnostic accent; no lettering, gradients, car silhouette, wrench, cog, shadows, or mockup device frame.
  - Make the mark high contrast with a generous safe area so it remains legible at launcher/favicons sizes.

- [ ] **Step 2: Present the generated preview without modifying product assets.**
  - The preview is a decision gate, not a shipped asset.
  - Request confirmation or a concrete adjustment; do not infer approval from silence.

### Task 2: Turn the approved master image into platform assets

**Files:**
- Create: `public/brand/zhiwei-car-service-icon.png`
- Create: `public/favicon.png`
- Modify: `index.html`
- Modify: `src-tauri/tauri.conf.json`
- Replace: `src-tauri/icons/32x32.png`
- Replace: `src-tauri/icons/64x64.png`
- Replace: `src-tauri/icons/128x128.png`
- Replace: `src-tauri/icons/128x128@2x.png`
- Replace: `src-tauri/icons/icon.png`
- Replace: `src-tauri/icons/icon.ico`
- Replace: `src-tauri/icons/icon.icns`
- Replace: `src-tauri/icons/Square*Logo.png`
- Replace: `src-tauri/icons/StoreLogo.png`
- Replace: `src-tauri/icons/android/**/ic_launcher*.png`
- Replace: `src-tauri/icons/ios/*.png`
- Create: `android-client/app/src/main/res/mipmap-*/ic_launcher.png`
- Create: `android-client/app/src/main/res/mipmap-*/ic_launcher_round.png`
- Create: `android-client/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml`
- Create: `android-client/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml`
- Modify: `android-client/app/src/main/AndroidManifest.xml`

- [ ] **Step 1: Preserve the approved master PNG under the public brand path.**
  - Keep it at 1024×1024, RGB/RGBA PNG, and use it as the sole visual source for all generated derivatives.
  - Link it from `index.html` as `favicon.png`; do not place text in the favicon.

- [ ] **Step 2: Generate all Tauri desktop formats from the master image.**
  - Use the Tauri icon generator to refresh the PNG, `.ico`, `.icns`, Windows Store Logo, Android, and iOS sets under `src-tauri/icons/`.
  - Retain the exact paths listed in `tauri.conf.json` so Windows bundle configuration stays valid.

- [ ] **Step 3: Install the Android launcher icon explicitly.**
  - Add `android:icon="@mipmap/ic_launcher"` and `android:roundIcon="@mipmap/ic_launcher_round"` to the `<application>` in `AndroidManifest.xml`.
  - Generate density-specific launcher PNGs and adaptive-icon XML from the same master asset; do not reuse `src-tauri/icons/android/` by reference because the Android app builds independently.

### Task 3: Apply the visible product name without changing technical identity

**Files:**
- Modify: `index.html`
- Modify: `src/App.jsx`
- Modify: `src-tauri/tauri.conf.json`
- Modify: `android-client/app/src/main/res/values/strings.xml`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/AppIdentity.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/ui/auth/LoginScreen.kt`

- [ ] **Step 1: Replace user-facing product titles with “智维车服”.**
  - Update the web document title, the desktop `productName`/window title, Android `app_name`, `AppIdentity.displayName`, and login-page brand text.
  - Keep functional navigation labels such as “维修接待” and “车辆保险” intact; they describe features, not the product name.

- [ ] **Step 2: Leave technical identifiers untouched.**
  - Do not rename Java/Kotlin packages, `Theme.Autoservice`, `com.chengxu.*`, `autoservice.db`, the Tauri application identifier, storage keys, test selectors, service URLs, Cloudflare project/database names, or existing database rows.

### Task 4: Verify, package, record, and publish source changes

**Files:**
- Modify: `docs/latest-handoff-prompt.md`
- Modify if required by visual QA: files from Tasks 2–3
- Create/update delivery artifact: `dist/releases/android/autoservice-android-debug-0.1.0.apk`

- [ ] **Step 1: Run web and desktop configuration checks.**
  - Run `npm.cmd run build` to verify the favicon and web title.
  - Run `npm.cmd run desktop:check` to verify Tauri metadata and icon paths without publishing a desktop installer.

- [ ] **Step 2: Run Android build checks and produce a real installable APK.**
  - Run `:app:testDebugUnitTest :app:compileDebugAndroidTestKotlin :app:lintDebug :app:assembleDebug` using the configured JDK/SDK.
  - Copy the resulting Debug APK to `dist/releases/android/autoservice-android-debug-0.1.0.apk`; validate it with `apksigner verify --verbose`.

- [ ] **Step 3: Perform launcher/icon visual acceptance.**
  - With the already authorized Android emulator, install the APK and confirm that Android shows the rounded-square W launcher icon and “智维车服” label.
  - Confirm the web build contains the same favicon reference and the desktop configuration still references generated icon files.

- [ ] **Step 4: Record the completed package and push it.**
  - Update `docs/latest-handoff-prompt.md` with the actual asset source, changed files, database impact (none), verification output, APK checksum, and remaining deployment/real-device notes.
  - Run `git diff --check`, commit only branding files plus the APK/handoff, and push `codex/android-mobile-ui-atlas` to GitHub.

## Acceptance Criteria

- The user approves a text-free “智维车服” icon preview before any shipping asset is changed.
- Once approved, web favicon, Windows desktop bundle assets, and Android launcher assets share the same visual mark.
- All visible product identity surfaces say “智维车服”; package IDs, storage/database identifiers, and service endpoints remain stable.
- Vite build, Tauri configuration check, Android JVM/test-source/lint/debug build, and APK signature validation pass.
- No D1/Room schema migration and no Pages/D1 deployment are performed.
