# 智纬可见名称替换 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将网页、Windows 客户端和 Android 的可见产品名称统一为“智纬”，同时保持所有技术标识、既有安装和 Android 下载链接兼容。

**Architecture:** 这是文案与产品清单变更，不改业务逻辑。Web 与 Windows 分别由 `index.html`、`src/App.jsx` 和 Tauri 配置提供可见名称；Android 由资源字符串、`AppIdentity` 与 Compose 登录页提供。Node 合同测试和 Android JVM 测试锁定名称，现有 APK URL/文件名不得改动。

**Tech Stack:** Vite/React、Tauri、Kotlin/Jetpack Compose、Node test、Gradle。

## Global Constraints

- 全部用户可见名称使用精确文案“智纬”。
- 保留图标、`com.chengxu.*`、D1/Room schema、API 路径、Android 下载 URL 和 `zhiwei-car-service_0.1.0.apk` 文件名。
- 不创建 migration，不修改业务数据，不使用子代理。
- 完成后更新 `docs/latest-handoff-prompt.md`、提交 Git 并推送 GitHub。

---

### Task 1: 锁定三端可见名称合同

**Files:**
- Modify: `test/zhiweiBrandContract.test.mjs`
- Modify: `test/tauriShellConfig.test.mjs`
- Modify: `android-client/app/src/test/java/com/chengxu/autoservice/BuildSanityTest.kt`

**Interfaces:**
- Consumes: Web `index.html`、Tauri `productName`、Android `app_name` 和 `AppIdentity.displayName`。
- Produces: 名称为“智纬”且保留 launcher 图标与技术标识的回归合同。

- [ ] **Step 1: 先写失败的名称断言**

```js
assert.match(readText('../index.html'), /智纬/);
assert.equal(config.productName, '智纬');
```

```kotlin
assertEquals("智纬", AppIdentity.displayName)
```

- [ ] **Step 2: 运行 Node 名称合同，确认旧名称导致失败**

Run: `npm.cmd test -- --test-name-pattern="visible brand|Tauri config"`

Expected: FAIL，因为现有可见名称仍为“智维车服”。

- [ ] **Step 3: 运行 Android JVM 名称合同，确认旧名称导致失败**

Run: `cd android-client; .\\gradlew.bat :app:testDebugUnitTest --tests com.chengxu.autoservice.BuildSanityTest`

Expected: FAIL，因为 `AppIdentity.displayName` 仍为旧名称。

- [ ] **Step 4: 提交测试合同**

```bash
git add test/zhiweiBrandContract.test.mjs test/tauriShellConfig.test.mjs android-client/app/src/test/java/com/chengxu/autoservice/BuildSanityTest.kt
git commit -m "test: expect zhiwei visible name"
```

### Task 2: 替换三端可见名称并保留安装兼容性

**Files:**
- Modify: `index.html`
- Modify: `src/App.jsx`
- Modify: `src/components/AndroidInstallQr.jsx`
- Modify: `src-tauri/tauri.conf.json`
- Modify: `android-client/app/src/main/res/values/strings.xml`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/AppIdentity.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/ui/auth/LoginScreen.kt`

**Interfaces:**
- Consumes: Task 1 的名称合同。
- Produces: 三端均显示“智纬”；APK URL、包名、图标路径和发布文件名不变。

- [ ] **Step 1: 将 Web 与 Windows 可见文案改为“智纬”**

```html
<title>智纬</title>
```

```json
{
  "productName": "智纬",
  "app": { "windows": [{ "title": "智纬" }] }
}
```

将 `src/App.jsx` 的登录页和应用内品牌文字，以及 `AndroidInstallQr.jsx` 的无障碍标签中的“智维车服”替换为“智纬”。不要修改 `public/brand/zhiwei-car-service-icon.png`、下载 URL 或其文件名。

- [ ] **Step 2: 将 Android 可见文案改为“智纬”**

```xml
<string name="app_name">智纬</string>
```

```kotlin
const val displayName = "智纬"
```

将 `LoginScreen.kt` 中的英文品牌行替换为 `ZHIWEI`，中文登录提示替换为“登录智纬移动端”。保留 `com.chengxu.autoservice` 包名及 launcher 图标资源。

- [ ] **Step 3: 运行 Task 1 的 Node 与 Android 合同，确认通过**

Run: `npm.cmd test -- --test-name-pattern="visible brand|Tauri config"`

Expected: PASS。

Run: `cd android-client; .\\gradlew.bat :app:testDebugUnitTest --tests com.chengxu.autoservice.BuildSanityTest`

Expected: BUILD SUCCESSFUL。

- [ ] **Step 4: 提交可见名称实现**

```bash
git add index.html src/App.jsx src/components/AndroidInstallQr.jsx src-tauri/tauri.conf.json android-client/app/src/main/res/values/strings.xml android-client/app/src/main/java/com/chengxu/autoservice/AppIdentity.kt android-client/app/src/main/java/com/chengxu/autoservice/ui/auth/LoginScreen.kt
git commit -m "feat(brand): rename visible product to zhiwei"
```

### Task 3: 全量验证、归档 APK 与交接

**Files:**
- Modify: `docs/latest-handoff-prompt.md`
- Modify: `public/downloads/zhiwei-car-service_0.1.0.apk`
- Modify: `dist/releases/android/autoservice-android-debug-0.1.0.apk`

**Interfaces:**
- Consumes: Task 2 的三端名称和既有 Android 发布资产。
- Produces: 已验证、可安装的新名称 APK 与准确交接记录。

- [ ] **Step 1: 运行完整 Node 验证**

Run: `npm.cmd test`

Expected: 0 failures。

- [ ] **Step 2: 运行 Android 全量门禁并生成 APK**

Run: `cd android-client; .\\gradlew.bat :app:testDebugUnitTest :app:compileDebugAndroidTestKotlin :app:lintDebug :app:assembleDebug`

Expected: BUILD SUCCESSFUL。


- [ ] **Step 3: 更新静态分发 APK、构建 Web 并归档 APK**

将 `android-client/app/build/outputs/apk/debug/app-debug.apk` 复制到 `public/downloads/zhiwei-car-service_0.1.0.apk`。随后运行：

Run: `npm.cmd run build`

Expected: Vite build 成功，且 `dist/downloads/zhiwei-car-service_0.1.0.apk` 存在。

将同一 `app-debug.apk` 复制到 `dist/releases/android/autoservice-android-debug-0.1.0.apk`，再运行：

Run: `apksigner verify --verbose dist/releases/android/autoservice-android-debug-0.1.0.apk`

Expected: v2 scheme 为 `true`。

- [ ] **Step 4: 部署并验证生产 APK**

Run: `npx.cmd wrangler pages deploy dist --project-name chengxu --branch main --commit-dirty=true --skip-caching`

Expected: Pages 部署成功。部署后运行：

Run: `curl -I https://chengxu.pages.dev/downloads/zhiwei-car-service_0.1.0.apk`

Expected: 200 和 `application/vnd.android.package-archive`。


Expected: 200 和 `application/vnd.android.package-archive`；下载文件 SHA-256 与新构建 APK 一致。

- [ ] **Step 5: 记录交接、提交并推送最终包**

在 `docs/latest-handoff-prompt.md` 追加名称替换、生产部署、验证结果、APK SHA-256、无数据库变更，以及后续发布注意事项。不得改写历史发布记录中的旧名称。

```bash
git add docs/latest-handoff-prompt.md public/downloads/zhiwei-car-service_0.1.0.apk dist/releases/android/autoservice-android-debug-0.1.0.apk
git commit -m "docs: record zhiwei visible name release"
git push origin codex/android-mobile-ui-atlas
```

## 自检

- 规格覆盖了 Web、Windows、Android、二维码无障碍文案和交接记录。
- 计划未修改 APK URL、文件名、包名、图标或数据库结构。
- 计划包含先失败后通过的名称合同，以及完整构建和签名验证。

## 执行结果（2026-07-28）

- 三端可见名称已替换为“智纬”，技术标识、图标、Android 包名与既有下载 URL/文件名保持不变。
- 名称合同先后经历预期 RED（旧名称）和 GREEN；Node 全量 203/203 通过，Android `testDebugUnitTest`、`compileDebugAndroidTestKotlin`、`lintDebug` 与 `assembleDebug` 均为 `BUILD SUCCESSFUL`。
- 重建 APK 已同步到 Pages 静态分发与本地归档；Pages 部署 `https://14ccca82.chengxu.pages.dev`。生产下载已验证 HTTP 200、APK MIME、应用标签“智纬”及 SHA-256 与构建产物一致。
