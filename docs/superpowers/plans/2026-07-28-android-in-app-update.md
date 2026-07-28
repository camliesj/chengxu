# Android 手动检查更新与应用内安装实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为智纬 Android 客户端提供“我的”页手动检查、下载并调用系统安装器安装官方 APK 的完整流程。

**Architecture:** 新增独立的 `core/update` 层，负责发布元数据获取、严格版本判断与下载状态；Android 平台安装器与 FileProvider 保持在 UI/Activity 边界。`UpdateViewModel` 只输出状态，`ProfileScreen` 只渲染和转发操作，避免网络与文件操作进入 Compose。

**Tech Stack:** Kotlin、Coroutines、kotlinx.serialization、Jetpack Compose、Android FileProvider、HttpURLConnection、JUnit。

## Global Constraints

- 仅用户手动点击检查；不自动检查、不强制更新。
- 仅接受 `/api/client-releases` 返回的 HTTPS Android 地址及严格更高的数值点分版本。
- APK 写入应用专属外部下载目录；不请求广泛存储权限，不写入 D1/Room 或业务缓存。
- 安装使用系统安装器和 FileProvider URI；未知来源授权由系统设置完成。
- 保持现有业务 API、权限、认证、D1 和 Room schema 不变。
- 每个任务完成后更新 `docs/latest-handoff-prompt.md`，提交并推送分支。

---

### Task 1: 发布元数据合同与版本判断

**Files:**
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/update/AppUpdateApi.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/update/HttpUrlConnectionAppUpdateApi.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/update/AppUpdateVersion.kt`
- Test: `android-client/app/src/test/java/com/chengxu/autoservice/core/update/HttpUrlConnectionAppUpdateApiTest.kt`
- Test: `android-client/app/src/test/java/com/chengxu/autoservice/core/update/AppUpdateVersionTest.kt`

**Interfaces:**
- Produces: `AppUpdateRelease(version: String, publishedAt: String, size: String, notes: String, downloadUrl: String)`.
- Produces: `AppUpdateApi.fetch(): AppUpdateFetchResult` and `AppUpdateVersion.isStrictlyNewer(remote, current): Boolean`.

- [ ] **Step 1: Write failing API and version tests**

```kotlin
@Test fun fetch_accepts_available_android_https_release() = runTest {
  val result = apiWith(200, """{\"android\":{\"available\":true,\"version\":\"0.1.1\",\"downloadUrl\":\"https://chengxu.pages.dev/downloads/app.apk\"}}""").fetch()
  assertEquals("0.1.1", (result as AppUpdateFetchResult.Success).release.version)
}

@Test fun isStrictlyNewer_rejects_equal_lower_or_invalid_versions() {
  assertTrue(AppUpdateVersion.isStrictlyNewer("0.1.1", "0.1.0"))
  assertFalse(AppUpdateVersion.isStrictlyNewer("0.1.0", "0.1.0"))
  assertFalse(AppUpdateVersion.isStrictlyNewer("preview", "0.1.0"))
}
```

- [ ] **Step 2: Run the two tests and verify RED**

Run: `cd android-client; .\gradlew.bat :app:testDebugUnitTest --tests "*AppUpdate*"`

Expected: FAIL because update production types do not exist.

- [ ] **Step 3: Implement strict contract parsing**

```kotlin
interface AppUpdateApi { suspend fun fetch(): AppUpdateFetchResult }
sealed interface AppUpdateFetchResult {
  data class Success(val release: AppUpdateRelease?) : AppUpdateFetchResult
  data class Failure(val reason: AppUpdateFailure) : AppUpdateFetchResult
}

object AppUpdateVersion {
  fun isStrictlyNewer(remote: String, current: String): Boolean =
    parse(remote)?.let { candidate -> parse(current)?.let { installed -> candidate > installed } } ?: false
}
```

Implement `HttpUrlConnectionAppUpdateApi` with a 10-second HTTPS GET to `${apiOrigin}/api/client-releases`; return `Success(null)` for unavailable, non-HTTPS or invalid versions and map network/malformed/server responses explicitly.

- [ ] **Step 4: Run focused tests and commit**

Run: `cd android-client; .\gradlew.bat :app:testDebugUnitTest --tests "*AppUpdate*"`

Expected: PASS.

Commit: `git add android-client/app/src/main/java/com/chengxu/autoservice/core/update android-client/app/src/test/java/com/chengxu/autoservice/core/update; git commit -m "feat(android): add update release contract"`

### Task 2: 下载器、安装器与受限文件共享

**Files:**
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/update/AppUpdateDownloader.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/update/AndroidAppUpdateInstaller.kt`
- Create: `android-client/app/src/main/res/xml/app_update_paths.xml`
- Modify: `android-client/app/src/main/AndroidManifest.xml`
- Modify: `android-client/app/build.gradle.kts`
- Test: `android-client/app/src/test/java/com/chengxu/autoservice/core/update/AppUpdateDownloaderTest.kt`

**Interfaces:**
- Consumes: validated `AppUpdateRelease.downloadUrl` from Task 1.
- Produces: `DownloadResult.Ready(file: File)` and `AppUpdateInstaller.install(file): InstallRequest`.

- [ ] **Step 1: Write failing download behavior test**

```kotlin
@Test fun downloader_writes_completed_https_response_to_final_apk() = runTest {
  val result = downloader.download("https://chengxu.pages.dev/downloads/0.1.1.apk") { }
  assertEquals("zhiwei-update.apk", (result as DownloadResult.Ready).file.name)
  assertTrue(result.file.readBytes().contentEquals(byteArrayOf(1, 2, 3)))
}
```

- [ ] **Step 2: Run the test and verify RED**

Run: `cd android-client; .\gradlew.bat :app:testDebugUnitTest --tests "*AppUpdateDownloaderTest"`

Expected: FAIL because downloader types do not exist.

- [ ] **Step 3: Implement atomic download and installation request**

```kotlin
interface AppUpdateDownloader {
  suspend fun download(url: String, onProgress: (downloaded: Long, total: Long?) -> Unit): DownloadResult
}

sealed interface DownloadResult {
  data class Ready(val file: File) : DownloadResult
  data class Failed(val message: String) : DownloadResult
}
```

Download only HTTPS into `context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS)`, write `zhiwei-update.apk.part`, then rename to `zhiwei-update.apk` only after HTTP 200 and non-empty body. Add the explicit `androidx.core:core-ktx` dependency, manifest `REQUEST_INSTALL_PACKAGES`, and `androidx.core.content.FileProvider` with an `external-files-path` limited to the update download folder. Installer builds `ACTION_VIEW` with `application/vnd.android.package-archive`, `FLAG_GRANT_READ_URI_PERMISSION`, and returns a settings request when `packageManager.canRequestPackageInstalls()` is false.

- [ ] **Step 4: Run focused tests and Android compilation, then commit**

Run: `cd android-client; .\gradlew.bat :app:testDebugUnitTest --tests "*AppUpdateDownloaderTest" :app:compileDebugAndroidTestKotlin`

Expected: PASS and `BUILD SUCCESSFUL`.

Commit: `git add android-client/app/build.gradle.kts android-client/app/src/main/AndroidManifest.xml android-client/app/src/main/res/xml/app_update_paths.xml android-client/app/src/main/java/com/chengxu/autoservice/core/update android-client/app/src/test/java/com/chengxu/autoservice/core/update; git commit -m "feat(android): download and install app updates"`

### Task 3: 更新状态机与“我的”页界面

**Files:**
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/ui/update/UpdateViewModel.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/ui/update/UpdateState.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/ui/profile/ProfileScreen.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/AutoserviceApp.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/MainActivity.kt`
- Test: `android-client/app/src/test/java/com/chengxu/autoservice/ui/update/UpdateViewModelTest.kt`

**Interfaces:**
- Consumes: Task 1 `AppUpdateApi`, Task 2 `AppUpdateDownloader` and installer callback.
- Produces: `StateFlow<UpdateState>` and `check()`, `download()`, `install()` actions for `ProfileScreen`.

- [ ] **Step 1: Write failing ViewModel state tests**

```kotlin
@Test fun check_shows_available_release_only_when_remote_is_newer() = runTest {
  viewModel.check()
  assertEquals(UpdatePhase.AVAILABLE, viewModel.state.value.phase)
  assertEquals("0.1.1", viewModel.state.value.release?.version)
}

@Test fun check_shows_up_to_date_for_equal_release() = runTest {
  equalVersionViewModel.check()
  assertEquals(UpdatePhase.UP_TO_DATE, equalVersionViewModel.state.value.phase)
}
```

- [ ] **Step 2: Run ViewModel tests and verify RED**

Run: `cd android-client; .\gradlew.bat :app:testDebugUnitTest --tests "*UpdateViewModelTest"`

Expected: FAIL because the update state machine does not exist.

- [ ] **Step 3: Implement UI state and bind it to ProfileScreen**

```kotlin
enum class UpdatePhase { IDLE, CHECKING, UP_TO_DATE, AVAILABLE, DOWNLOADING, READY_TO_INSTALL, NEEDS_INSTALL_PERMISSION, FAILED }
data class UpdateState(val phase: UpdatePhase = UpdatePhase.IDLE, val release: AppUpdateRelease? = null, val downloadedBytes: Long = 0, val totalBytes: Long? = null, val message: String? = null)
```

Create an update card matching `ProfileDetailCard` visual language: current version, “检查更新” button, update information dialog, determinate/indeterminate download indicator and retry/install controls. Wire its Android `Intent` effects from `AutoserviceApp`/`MainActivity`; never launch an Intent directly from the composable.

- [ ] **Step 4: Run focused tests and commit**

Run: `cd android-client; .\gradlew.bat :app:testDebugUnitTest --tests "*UpdateViewModelTest"`

Expected: PASS.

Commit: `git add android-client/app/src/main/java/com/chengxu/autoservice/ui/update android-client/app/src/main/java/com/chengxu/autoservice/ui/profile/ProfileScreen.kt android-client/app/src/main/java/com/chengxu/autoservice/AutoserviceApp.kt android-client/app/src/main/java/com/chengxu/autoservice/MainActivity.kt android-client/app/src/test/java/com/chengxu/autoservice/ui/update; git commit -m "feat(android): add manual update screen"`

### Task 4: Full verification, release artifact and handoff

**Files:**
- Modify: `docs/latest-handoff-prompt.md`
- Modify: `android-client/app/build.gradle.kts` (increment to next release version)
- Modify: `public/downloads/zhiwei-car-service_0.1.1.apk`
- Modify: `dist/releases/android/autoservice-android-debug-0.1.1.apk`

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces: signed debug APK with increased version and documented validation results.

- [ ] **Step 1: Add/update version regression expectation and verify red if version is unchanged**

```kotlin
@Test fun build_config_exposes_release_version_0_1_1() {
  assertEquals("0.1.1", BuildConfig.VERSION_NAME)
}
```

- [ ] **Step 2: Increment `versionCode` and `versionName`, then run the full Android gate**

Run:

```powershell
cd E:\codex\chengxu\android-client
$env:JAVA_HOME='E:\codex\APP\.android-build\jdk\jdk-17.0.19+10'
$env:ANDROID_HOME='E:\codex\APP\.android-build\android-sdk'
.\gradlew.bat :app:testDebugUnitTest :app:compileDebugAndroidTestKotlin :app:lintDebug :app:assembleDebug
```

Expected: `BUILD SUCCESSFUL`.

- [ ] **Step 3: Archive and verify APK**

Copy the built APK into both versioned archive paths, run Build Tools `apksigner verify --verbose --print-certs`, calculate SHA-256, and verify `aapt dump badging` reports the expected `versionName`, incremented `versionCode`, package ID and `智纬` label.

- [ ] **Step 4: Update handoff, commit and push**

Record completed UI/API behavior, modified files, unchanged D1/Room schema, APK path/hash and next real-device checks in `docs/latest-handoff-prompt.md`.

Commit: `git add android-client/app/build.gradle.kts public/downloads/zhiwei-car-service_0.1.1.apk dist/releases/android/autoservice-android-debug-0.1.1.apk docs/latest-handoff-prompt.md; git commit -m "feat(android): add manual in-app update"`

Push: `git push origin codex/android-mobile-ui-atlas`
