# 智维车服品牌与 Android 安装二维码发布 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将“智维车服”统一品牌落地到网页、Windows 和 Android，并发布一份可由网页登录页二维码直达下载的 Android APK。

**Architecture:** 发布层把 Android APK 视为与 Windows 安装包平行的平台 artifact：共享安全校验和 COS 存取，实现平台专用 key 与公开下载路由。登录页异步读取已有公开 release metadata，只有得到 Android HTTPS download URL 后才在本地生成二维码；品牌资源由已批准主图派生，技术标识保持不变。

**Tech Stack:** Cloudflare Pages Functions、Tencent COS、React 19/Vite、`qrcode.react`、Tauri 2、Android Gradle/Compose、`@tauri-apps/cli` icon generator。

## Global Constraints

- 统一用户可见名称为“智维车服”。
- 图标使用已确认的无文字深石墨圆角方形、抽象 W 服务路径与冰蓝点缀；不使用字样、写实车辆、扳手、齿轮或渐变。
- Android artifact 仅允许 `.apk`、`application/vnd.android.package-archive` 或 `application/octet-stream`，最大 25 MiB。
- Android COS key 固定为 `releases/android/<version>/zhiwei-car-service_<version>.apk`；Windows release key 和下载路径不变。
- 二维码直接编码公开 HTTPS APK 下载 URL，在浏览器与 Windows 客户端登录页显示；Android 应用登录页不显示该二维码。
- 二维码在浏览器本地生成，绝不使用第三方二维码服务；Android 未发布或读取失败时不得生成空码。
- 不变更 `com.chengxu.autoservice`、`com.chengxu.repairmanager`、`Theme.Autoservice`、`autoservice.db`、`chengxu-*` 存储键、D1/COS 既有标识、业务 API 路径、订单/档案/权限模型。
- 不新增 D1/Room migration。任何远程上传、环境变量写入和 Pages 部署仅在用户授权后进行。
- 每个完成包更新 `docs/latest-handoff-prompt.md`、提交并推送当前分支；当前会话内联执行，不使用子代理。

---

### Task 1: 建立 Android release artifact 合同与受控下载路由

**Files:**
- Modify: `functions/_shared/release-artifacts.js`
- Modify: `functions/api/release-artifacts.js`
- Create: `functions/api/client-downloads/android/[version]/[fileName].js`
- Modify: `test/releaseArtifacts.test.mjs`
- Modify: `test/releasesFunction.test.mjs`

**Interfaces:**
- Produces `validateReleaseArtifact(platform, version, fileName)`, `releaseArtifactKey(platform, version, fileName)`, and `releaseDownloadPath(platform, version, fileName)`.
- Produces `GET /api/client-downloads/android/:version/:fileName`, which returns an attachment stream or 404 without exposing COS keys.
- `POST /api/release-artifacts` consumes `x-release-platform: android`, `x-release-version`, `x-file-name`, and the APK bytes; it returns `{ ok, key, downloadUrl, size }`.

- [ ] **Step 1: Write failing Node tests for Android artifact validation and routes.**
  - Add a valid fixture `('android', '0.1.0', 'zhiwei-car-service_0.1.0.apk')` and assert the exact key `releases/android/0.1.0/zhiwei-car-service_0.1.0.apk` and encoded download path.
  - Assert `validateReleaseArtifact('android', '0.1.0', '../evil.apk')`, a `.exe` Android name, and an unknown platform throw `INVALID_RELEASE_FILE` or `INVALID_RELEASE_PLATFORM`.
  - Mock `cosFetch` and assert the new Android GET route reads the expected key, returns `application/vnd.android.package-archive`, attachment disposition, and 404 for invalid input/COS absence.
  - Mock admin session/upload and assert an Android APK content type succeeds while `image/png` returns `INVALID_RELEASE_CONTENT_TYPE`.

- [ ] **Step 2: Run the focused tests to verify RED.**

Run: `node --test test/releaseArtifacts.test.mjs test/releasesFunction.test.mjs`

Expected: FAIL because platform-aware helpers and Android download route do not exist.

- [ ] **Step 3: Implement platform-aware artifact helpers.**

```js
const ARTIFACTS = {
  windows: { pattern: /^[^/\\]+\.exe$/i, key: (v) => `releases/windows/${v}/chengxu_${v}_x64-setup.exe`, contentType: 'application/octet-stream' },
  android: { pattern: /^[^/\\]+\.apk$/i, key: (v) => `releases/android/${v}/zhiwei-car-service_${v}.apk`, contentType: 'application/vnd.android.package-archive' },
};
```

  - Require a declared `platform`; preserve current Windows public routes by passing `'windows'` internally.
  - Let the upload handler default absent `x-release-platform` to `windows` for backward compatibility, then select platform-specific allowed content types.
  - Add the Android route using `cosFetch('GET', releaseArtifactKey('android', ...), env)` and the existing `cosFailure`/content-disposition pattern.

- [ ] **Step 4: Run the focused tests to verify GREEN.**

Run: `node --test test/releaseArtifacts.test.mjs test/releasesFunction.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit the isolated backend contract.**

```powershell
git add functions/_shared/release-artifacts.js functions/api/release-artifacts.js functions/api/client-downloads/android/[version]/[fileName].js test/releaseArtifacts.test.mjs test/releasesFunction.test.mjs
git commit -m "feat(release): publish android apk artifacts"
```

### Task 2: 在登录页本地生成 Android 安装二维码

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/components/AndroidInstallQr.jsx`
- Modify: `src/App.jsx`
- Modify: `src/styles.css`
- Modify: `src/clientReleaseLogic.js`
- Create: `test/androidInstallQrLogic.test.mjs`

**Interfaces:**
- Produces `androidInstallQrState(payload, requestError)` in `src/clientReleaseLogic.js`, returning `{ status: 'ready' | 'unavailable' | 'error', release }`.
- Produces `AndroidInstallQr({ onOpenDownloads })`; it fetches `/api/client-releases`, displays a `qrcode.react` SVG only for `status === 'ready'`, and delegates fallback/open URL actions to existing platform helpers.
- `AccessGate` consumes the component in the existing `access-footer` position and keeps `ClientDownloadsDialog` available.

- [ ] **Step 1: Add failing pure-logic tests.**

```js
assert.deepEqual(androidInstallQrState({ android: { available: true, downloadUrl: 'https://chengxu.pages.dev/api/client-downloads/android/0.1.0/zhiwei-car-service_0.1.0.apk' } }), {
  status: 'ready',
  release: expectNormalizedAndroidRelease,
});
assert.equal(androidInstallQrState({ android: { available: false } }).status, 'unavailable');
assert.equal(androidInstallQrState({}, new Error('NETWORK')).status, 'error');
```

- [ ] **Step 2: Run the focused test to verify RED.**

Run: `node --test test/androidInstallQrLogic.test.mjs`

Expected: FAIL because `androidInstallQrState` is not exported.

- [ ] **Step 3: Add `qrcode.react` and the focused QR component.**
  - Install `qrcode.react` as a production dependency.
  - Implement `androidInstallQrState` by normalizing `payload.android` through `normalizeRelease`; only valid `available + downloadUrl` becomes `ready`.
  - `AndroidInstallQr` fetches once on mount through `apiFetch('/api/client-releases')`, aborts stale effects, renders `QRCodeSVG value={release.downloadUrl}`, and uses `openExternal(release.downloadUrl)` for the “下载 Android APP” button.
  - For `unavailable`, show “Android 安装包发布中”；for `error`, show “无法读取安装包信息” plus a retry button; neither state imports/renders a QR SVG.
  - Place the component beneath the existing client download action, with a compact card, accessible `aria-label` values, version/size metadata, and responsive one-column layout under 640px.

- [ ] **Step 4: Run logic tests and web build.**

Run: `node --test test/androidInstallQrLogic.test.mjs && npm.cmd run build`

Expected: PASS and Vite build succeeds.

- [ ] **Step 5: Commit the login-page QR package.**

```powershell
git add package.json package-lock.json src/components/AndroidInstallQr.jsx src/App.jsx src/styles.css src/clientReleaseLogic.js test/androidInstallQrLogic.test.mjs
git commit -m "feat(web): add android install qr to login"
```

### Task 3: 落实智维车服名称与主图派生资源

**Files:**
- Create: `public/brand/zhiwei-car-service-icon.png`
- Create: `public/favicon.png`
- Modify: `index.html`
- Modify: `src/App.jsx`
- Modify: `src-tauri/tauri.conf.json`
- Replace: `src-tauri/icons/32x32.png`, `src-tauri/icons/64x64.png`, `src-tauri/icons/128x128.png`, `src-tauri/icons/128x128@2x.png`, `src-tauri/icons/icon.png`, `src-tauri/icons/icon.ico`, `src-tauri/icons/icon.icns`, `src-tauri/icons/Square*Logo.png`, `src-tauri/icons/StoreLogo.png`
- Create: `android-client/app/src/main/res/mipmap-*/ic_launcher.png`, `android-client/app/src/main/res/mipmap-*/ic_launcher_round.png`, `android-client/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml`, `android-client/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml`
- Modify: `android-client/app/src/main/AndroidManifest.xml`
- Modify: `android-client/app/src/main/res/values/strings.xml`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/AppIdentity.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/ui/auth/LoginScreen.kt`
- Test: `test/desktopClientContract.test.mjs`

**Interfaces:**
- Produces a single source asset at `public/brand/zhiwei-car-service-icon.png` and generated browser/Tauri/Android derivatives.
- Produces Android launcher references `@mipmap/ic_launcher` and `@mipmap/ic_launcher_round` without package or theme rename.

- [ ] **Step 1: Add a failing source-contract assertion.**
  - Extend `test/desktopClientContract.test.mjs` to assert `index.html`, `src-tauri/tauri.conf.json`, and Android `strings.xml` contain “智维车服”; assert manifest uses the launcher icon references; assert the public brand source asset and favicon exist.

- [ ] **Step 2: Run the focused contract test to verify RED.**

Run: `node --test test/desktopClientContract.test.mjs`

Expected: FAIL because the old visible product name and launcher resources remain.

- [ ] **Step 3: Derive platform assets from the approved image.**
  - Copy the approved 1024×1024 PNG to `public/brand/zhiwei-car-service-icon.png`; make `public/favicon.png` from it.
  - Run the Tauri icon generator against the master image to regenerate required Windows/Store/Android/iOS files under `src-tauri/icons/`.
  - Generate Android density launcher PNGs and adaptive icon XML from the same master image, then add explicit `android:icon` and `android:roundIcon` attributes to the manifest.
  - Replace only visible title/copy in the listed files with “智维车服”; retain all technical identifiers.

- [ ] **Step 4: Run branding contracts and cross-platform build metadata checks.**

Run: `node --test test/desktopClientContract.test.mjs && npm.cmd run build && npm.cmd run desktop:check`

Expected: PASS; Vite and Tauri metadata checks succeed.

- [ ] **Step 5: Commit the visual branding package.**

```powershell
git add public/brand/zhiwei-car-service-icon.png public/favicon.png index.html src/App.jsx src-tauri/tauri.conf.json src-tauri/icons android-client/app/src/main/AndroidManifest.xml android-client/app/src/main/res android-client/app/src/main/java/com/chengxu/autoservice/AppIdentity.kt android-client/app/src/main/java/com/chengxu/autoservice/ui/auth/LoginScreen.kt test/desktopClientContract.test.mjs
git commit -m "feat(brand): apply zhiwei car service identity"
```

### Task 4: 构建 APK、远程发布并完成端到端核验

**Files:**
- Modify: `.env.example`
- Modify: `docs/latest-handoff-prompt.md`
- Create/update: `dist/releases/android/autoservice-android-debug-0.1.0.apk`

**Interfaces:**
- Consumes the Task 1 Android upload endpoint and Task 3 signed Debug APK.
- Produces production `ANDROID_RELEASE_*` metadata where `downloadUrl` is the Android public download route.

- [ ] **Step 1: Run the complete pre-release verification gate.**

Run:

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run desktop:check
cd android-client
$env:JAVA_HOME='E:\codex\APP\.android-build\jdk\jdk-17.0.19+10'
$env:ANDROID_HOME='E:\codex\APP\.android-build\android-sdk'
.\gradlew.bat :app:testDebugUnitTest :app:compileDebugAndroidTestKotlin :app:lintDebug :app:assembleDebug
```

Expected: all commands succeed.

- [ ] **Step 2: Archive and sign-check the exact APK.**
  - Copy `android-client/app/build/outputs/apk/debug/app-debug.apk` to `dist/releases/android/autoservice-android-debug-0.1.0.apk`.
  - Run Build Tools 35.0.0 `apksigner verify --verbose` against the archived file and calculate SHA-256.

- [ ] **Step 3: Publish only after explicit release authorization.**
  - Deploy updated Functions/website to Pages production.
  - Obtain an administrator session through the existing login flow, `POST` the exact APK with `x-release-platform: android`, `x-release-version: 0.1.0`, `x-file-name: zhiwei-car-service_0.1.0.apk`, and `content-type: application/vnd.android.package-archive`.
  - Set the five `ANDROID_RELEASE_*` Pages variables with the returned download URL, file size, timestamp, and notes; redeploy if required for bindings.

- [ ] **Step 4: Run non-mutating production smoke checks.**
  - Read `GET /api/client-releases` and assert `android.available === true` plus an HTTPS URL matching `/api/client-downloads/android/0.1.0/`.
  - GET the returned download URL and assert `200`, APK content type, attachment disposition, and a nonzero content length; do not download/write any business data.
  - Open the production login page, confirm the QR encodes the returned URL, and scan/open it on an Android device or emulator.

- [ ] **Step 5: Install and inspect the branded Android APK.**
  - Install the archived APK on the already authorized `industrial_mobile_api35_ws` emulator.
  - Confirm launcher label “智维车服”, the W icon, and Android login still reaches the company/account/password form.

- [ ] **Step 6: Record and publish the finished package.**
  - Update `.env.example` with Android release variable meanings and `docs/latest-handoff-prompt.md` with exact artifact size/hash, changed files, database impact (none), production smoke result, and remaining real-device Android unknown-sources acceptance.
  - Run `git diff --check`; commit and push all remaining source, docs, asset, and APK changes.

## Acceptance Criteria

- A public HTTPS Android download route streams exactly the versioned COS APK and rejects unsafe platform/version/filename input.
- The common web/Windows login page displays a local QR code plus accessible fallback button only when Android release metadata is available.
- The branded asset and visible name “智维车服” appear across web, Windows, and Android while all technical identities remain stable.
- Node full suite, Vite build, Tauri check, Android JVM/test-source/lint/Debug build and APK signature validation pass.
- No D1/Room migration is added. Production release actions occur only with user authorization and leave business records unchanged.
