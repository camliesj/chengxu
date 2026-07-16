# Android Production Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an independently installable Android 8.0+ native client foundation with five-tab navigation, the approved light-tech design system, employee/admin workbenches, centralized permissions, and real offline read-only gating.

**Architecture:** Create a single-module Kotlin/Jetpack Compose application under `android-client/`. UI reads immutable `StateFlow` state from repositories and view models; Navigation 3 owns typed back stacks; session and connectivity are injected behind interfaces so tests use deterministic fakes and later API/Room work can replace implementations without rewriting screens.

**Tech Stack:** JDK 17, Gradle 8.13, Android Gradle Plugin 8.13.2, Kotlin 2.3.21, Jetpack Compose BOM 2026.06.00, Material 3, Navigation 3 1.1.4, Lifecycle 2.10.0, Activity Compose 1.13.0, Kotlin coroutines, JUnit 4, AndroidX Compose UI Test.

## Global Constraints

- Android only; `minSdk = 26`, `compileSdk = 36`, `targetSdk = 35`.
- Debug `applicationId` is `com.chengxu.autoservice`; confirm the final release package before store signing.
- Keep the Android project in `android-client/`; do not modify the web or Windows layouts to emulate mobile UI.
- Use the 390 x 844 PNGs in `design/mobile-ui/output/` as the only visual reference.
- Fixed root tabs: 工作台、工单、新增、档案、我的; 新增 remains the center tab.
- Employee can advance an order through 待结算 but cannot settle, reverse settlement, void, or maintain receipts.
- Administrator has all employee permissions plus settlement, reverse settlement, void, and receipt maintenance.
- Offline means read-only: every mutation is rejected by one `MutationGate`, and the UI states the reason.
- Stage one contains no production API, COS, Room, real login, order writes, release signing, or visible role switch in release builds.
- Every task follows red-green-refactor, ends with a focused commit, pushes the current branch, and updates `docs/latest-handoff-prompt.md` when the available behavior changes.
- Run Gradle command blocks from `android-client/`; run Git and npm command blocks from repository root `E:\codex\chengxu`.

## File Map

```text
android-client/
  settings.gradle.kts
  build.gradle.kts
  gradle.properties
  gradlew
  gradlew.bat
  gradle/wrapper/
  gradle/libs.versions.toml
  app/build.gradle.kts
  app/proguard-rules.pro
  app/src/main/AndroidManifest.xml
  app/src/main/java/com/chengxu/autoservice/
    MainActivity.kt
    AppIdentity.kt
    AutoserviceApp.kt
    core/designsystem/AutoserviceTheme.kt
    core/designsystem/AutoserviceTokens.kt
    core/designsystem/AutoserviceComponents.kt
    core/model/AppPermission.kt
    core/model/UserRole.kt
    core/network/ConnectionState.kt
    core/network/NetworkMonitor.kt
    core/network/AndroidConnectivityNetworkMonitor.kt
    core/session/AppSession.kt
    core/session/PermissionSnapshot.kt
    core/session/SessionRepository.kt
    core/session/InMemorySessionRepository.kt
    core/session/MutationGate.kt
    navigation/AppRoute.kt
    navigation/RootTab.kt
    navigation/AppNavigationState.kt
    navigation/AppNavDisplay.kt
    ui/shell/AutoserviceShell.kt
    ui/shell/OfflineBanner.kt
    ui/workbench/WorkbenchModels.kt
    ui/workbench/WorkbenchRepository.kt
    ui/workbench/DemoWorkbenchRepository.kt
    ui/workbench/WorkbenchViewModel.kt
    ui/workbench/WorkbenchScreen.kt
    ui/workbench/WorkbenchComponents.kt
    ui/stage/StageScreen.kt
  app/src/main/res/values/strings.xml
  app/src/main/res/values/themes.xml
  app/src/test/java/com/chengxu/autoservice/
    core/session/PermissionSnapshotTest.kt
    core/session/MutationGateTest.kt
    navigation/AppNavigationStateTest.kt
    ui/workbench/WorkbenchViewModelTest.kt
  app/src/androidTest/java/com/chengxu/autoservice/
    AutoserviceShellTest.kt
    WorkbenchScreenTest.kt
docs/android-client.md
docs/latest-handoff-prompt.md
```

---

### Task 1: Buildable Android Project Skeleton

**Files:**
- Create: `android-client/settings.gradle.kts`
- Create: `android-client/build.gradle.kts`
- Create: `android-client/gradle.properties`
- Create: `android-client/gradle/libs.versions.toml`
- Create: `android-client/app/build.gradle.kts`
- Create: `android-client/app/proguard-rules.pro`
- Create: `android-client/app/src/main/AndroidManifest.xml`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/MainActivity.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/AppIdentity.kt`
- Create: `android-client/app/src/main/res/values/strings.xml`
- Create: `android-client/app/src/main/res/values/themes.xml`
- Create: `android-client/app/src/test/java/com/chengxu/autoservice/BuildSanityTest.kt`
- Modify: `.gitignore`

**Interfaces:**
- Produces: an `android-client/gradlew.bat` build entry point and a launchable `MainActivity`.

- [ ] **Step 1: Add the project files and a deliberately failing sanity test**

Before running any project test, create the wrapper from a standalone temporary build directory so the installed Gradle 8.10.2 does not configure the AGP 8.13.2 project:

```powershell
$bootstrap = Join-Path $env:TEMP 'autoservice-gradle-wrapper'
New-Item -ItemType Directory -Force -Path $bootstrap | Out-Null
Set-Content -LiteralPath (Join-Path $bootstrap 'settings.gradle.kts') -Value 'rootProject.name = "wrapper-bootstrap"'
Set-Content -LiteralPath (Join-Path $bootstrap 'build.gradle.kts') -Value ''
& 'E:\codex\APP\.android-build\gradle\gradle-8.10.2\bin\gradle.bat' -p $bootstrap wrapper --gradle-version 8.13 --distribution-type bin
Copy-Item -LiteralPath (Join-Path $bootstrap 'gradlew') -Destination 'android-client\gradlew'
Copy-Item -LiteralPath (Join-Path $bootstrap 'gradlew.bat') -Destination 'android-client\gradlew.bat'
Copy-Item -LiteralPath (Join-Path $bootstrap 'gradle') -Destination 'android-client\gradle' -Recurse
```

Use this version catalog:

```toml
[versions]
agp = "8.13.2"
kotlin = "2.3.21"
composeBom = "2026.06.00"
activityCompose = "1.13.0"
lifecycle = "2.10.0"
navigation3 = "1.1.4"
coroutines = "1.10.2"
junit = "4.13.2"
androidxTestExt = "1.3.0"
espresso = "3.7.0"

[libraries]
androidx-activity-compose = { module = "androidx.activity:activity-compose", version.ref = "activityCompose" }
androidx-lifecycle-runtime-compose = { module = "androidx.lifecycle:lifecycle-runtime-compose", version.ref = "lifecycle" }
androidx-lifecycle-viewmodel-compose = { module = "androidx.lifecycle:lifecycle-viewmodel-compose", version.ref = "lifecycle" }
androidx-navigation3-runtime = { module = "androidx.navigation3:navigation3-runtime", version.ref = "navigation3" }
androidx-navigation3-ui = { module = "androidx.navigation3:navigation3-ui", version.ref = "navigation3" }
compose-bom = { module = "androidx.compose:compose-bom", version.ref = "composeBom" }
compose-ui = { module = "androidx.compose.ui:ui" }
compose-ui-tooling = { module = "androidx.compose.ui:ui-tooling" }
compose-ui-tooling-preview = { module = "androidx.compose.ui:ui-tooling-preview" }
compose-ui-test-junit4 = { module = "androidx.compose.ui:ui-test-junit4" }
compose-ui-test-manifest = { module = "androidx.compose.ui:ui-test-manifest" }
compose-material3 = { module = "androidx.compose.material3:material3" }
compose-material-icons-extended = { module = "androidx.compose.material:material-icons-extended" }
kotlinx-coroutines-android = { module = "org.jetbrains.kotlinx:kotlinx-coroutines-android", version.ref = "coroutines" }
kotlinx-coroutines-test = { module = "org.jetbrains.kotlinx:kotlinx-coroutines-test", version.ref = "coroutines" }
junit = { module = "junit:junit", version.ref = "junit" }
androidx-test-ext-junit = { module = "androidx.test.ext:junit", version.ref = "androidxTestExt" }
androidx-test-espresso-core = { module = "androidx.test.espresso:espresso-core", version.ref = "espresso" }

[plugins]
android-application = { id = "com.android.application", version.ref = "agp" }
kotlin-android = { id = "org.jetbrains.kotlin.android", version.ref = "kotlin" }
kotlin-compose = { id = "org.jetbrains.kotlin.plugin.compose", version.ref = "kotlin" }
kotlin-serialization = { id = "org.jetbrains.kotlin.plugin.serialization", version.ref = "kotlin" }
```

`BuildSanityTest.kt` starts red:

```kotlin
package com.chengxu.autoservice

import org.junit.Assert.assertEquals
import org.junit.Test

class BuildSanityTest {
    @Test fun applicationNameContract() {
        assertEquals("汽修接待", AppIdentity.displayName)
    }
}
```

Use these complete project and app build contracts:

```kotlin
// settings.gradle.kts
pluginManagement {
    repositories { google(); mavenCentral(); gradlePluginPortal() }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories { google(); mavenCentral() }
}
rootProject.name = "AutoserviceAndroid"
include(":app")
```

```kotlin
// build.gradle.kts
plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.kotlin.compose) apply false
    alias(libs.plugins.kotlin.serialization) apply false
}
```

```kotlin
// app/build.gradle.kts
plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.serialization)
}

android {
    namespace = "com.chengxu.autoservice"
    compileSdk = 36
    defaultConfig {
        applicationId = "com.chengxu.autoservice"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "0.1.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }
    buildFeatures { compose = true; buildConfig = true }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
    packaging { resources.excludes += "/META-INF/{AL2.0,LGPL2.1}" }
}

dependencies {
    implementation(platform(libs.compose.bom))
    androidTestImplementation(platform(libs.compose.bom))
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.navigation3.runtime)
    implementation(libs.androidx.navigation3.ui)
    implementation(libs.compose.ui)
    implementation(libs.compose.ui.tooling.preview)
    implementation(libs.compose.material3)
    implementation(libs.compose.material.icons.extended)
    implementation(libs.kotlinx.coroutines.android)
    debugImplementation(libs.compose.ui.tooling)
    debugImplementation(libs.compose.ui.test.manifest)
    testImplementation(libs.junit)
    testImplementation(libs.kotlinx.coroutines.test)
    androidTestImplementation(libs.androidx.test.ext.junit)
    androidTestImplementation(libs.androidx.test.espresso.core)
    androidTestImplementation(libs.compose.ui.test.junit4)
}
```

- [ ] **Step 2: Run the unit test and confirm the missing symbol failure**

Run:

```powershell
cd android-client
.\gradlew.bat :app:testDebugUnitTest --tests com.chengxu.autoservice.BuildSanityTest
```

Expected: compilation fails because `AppIdentity` does not exist.

- [ ] **Step 3: Add the minimal app identity and launch surface**

```kotlin
package com.chengxu.autoservice

object AppIdentity {
    const val displayName = "汽修接待"
}
```

Create the launch surface and resources exactly as follows:

```kotlin
package com.chengxu.autoservice

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.material3.Text

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { Text(AppIdentity.displayName) }
    }
}
```

```xml
<!-- app/src/main/AndroidManifest.xml -->
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <application
        android:allowBackup="false"
        android:label="@string/app_name"
        android:supportsRtl="true"
        android:theme="@style/Theme.Autoservice">
        <activity
            android:name=".MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
```

```xml
<!-- app/src/main/res/values/strings.xml -->
<resources><string name="app_name">汽修接待</string></resources>
```

```xml
<!-- app/src/main/res/values/themes.xml -->
<resources>
    <style name="Theme.Autoservice" parent="android:style/Theme.Material.Light.NoActionBar">
        <item name="android:fontFamily">sans</item>
        <item name="android:windowLightStatusBar">true</item>
        <item name="android:statusBarColor">#FFFFFF</item>
        <item name="android:navigationBarColor">#FFFFFF</item>
    </style>
</resources>
```

- [ ] **Step 4: Verify the completed skeleton**

Run:

```powershell
.\gradlew.bat :app:testDebugUnitTest :app:assembleDebug
```

Expected: `BuildSanityTest` passes and `app-debug.apk` is generated.

- [ ] **Step 5: Commit, push, and record the milestone**

```powershell
git add .gitignore android-client docs/latest-handoff-prompt.md
git commit -m "build: scaffold Android production client"
git push origin codex/android-mobile-ui-atlas
```

---

### Task 2: Permission Model and Mutation Gate

**Files:**
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/model/UserRole.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/model/AppPermission.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/network/ConnectionState.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/session/PermissionSnapshot.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/session/MutationGate.kt`
- Test: `android-client/app/src/test/java/com/chengxu/autoservice/core/session/PermissionSnapshotTest.kt`
- Test: `android-client/app/src/test/java/com/chengxu/autoservice/core/session/MutationGateTest.kt`

**Interfaces:**
- Produces: `PermissionSnapshot.forRole(UserRole)`, `MutationGate.evaluate(ConnectionState, AppPermission, PermissionSnapshot): MutationDecision`.

- [ ] **Step 1: Write failing role and offline-gate tests**

```kotlin
@Test fun employeeCannotPerformAdministrativeMutations() {
    val snapshot = PermissionSnapshot.forRole(UserRole.EMPLOYEE)
    assertTrue(snapshot.allows(AppPermission.ADVANCE_ORDER_STATUS))
    assertFalse(snapshot.allows(AppPermission.SETTLE_ORDER))
    assertFalse(snapshot.allows(AppPermission.REVERSE_SETTLEMENT))
    assertFalse(snapshot.allows(AppPermission.VOID_ORDER))
    assertFalse(snapshot.allows(AppPermission.MAINTAIN_RECEIPT))
}

@Test fun administratorHasAdministrativeMutations() {
    val snapshot = PermissionSnapshot.forRole(UserRole.ADMINISTRATOR)
    assertTrue(AppPermission.entries.all(snapshot::allows))
}

@Test fun offlineAlwaysRejectsMutationWithReadableReason() {
    val decision = MutationGate.evaluate(
        ConnectionState.Offline,
        AppPermission.CREATE_ORDER,
        PermissionSnapshot.forRole(UserRole.ADMINISTRATOR),
    )
    assertEquals(MutationDecision.Denied("网络不可用，当前为只读模式"), decision)
}

@Test fun onlineEmployeeStillCannotSettle() {
    val decision = MutationGate.evaluate(
        ConnectionState.Online,
        AppPermission.SETTLE_ORDER,
        PermissionSnapshot.forRole(UserRole.EMPLOYEE),
    )
    assertEquals(MutationDecision.Denied("当前账号无此操作权限"), decision)
}
```

- [ ] **Step 2: Run the focused tests and confirm unresolved types**

```powershell
.\gradlew.bat :app:testDebugUnitTest --tests "com.chengxu.autoservice.core.session.*"
```

Expected: compilation fails for `UserRole`, `ConnectionState`, `PermissionSnapshot`, and `MutationGate`.

- [ ] **Step 3: Implement immutable permission snapshots and the single mutation gate**

```kotlin
enum class UserRole { EMPLOYEE, ADMINISTRATOR }

enum class AppPermission {
    VIEW_ORDER, CREATE_ORDER, EDIT_ORDER, ADVANCE_ORDER_STATUS,
    SETTLE_ORDER, REVERSE_SETTLEMENT, VOID_ORDER, MAINTAIN_RECEIPT
}

enum class ConnectionState { Online, Offline }

data class PermissionSnapshot(private val granted: Set<AppPermission>) {
    fun allows(permission: AppPermission): Boolean = permission in granted

    companion object {
        fun forRole(role: UserRole): PermissionSnapshot = when (role) {
            UserRole.EMPLOYEE -> PermissionSnapshot(
                setOf(
                    AppPermission.VIEW_ORDER,
                    AppPermission.CREATE_ORDER,
                    AppPermission.EDIT_ORDER,
                    AppPermission.ADVANCE_ORDER_STATUS,
                )
            )
            UserRole.ADMINISTRATOR -> PermissionSnapshot(AppPermission.entries.toSet())
        }
    }
}

sealed interface MutationDecision {
    data object Allowed : MutationDecision
    data class Denied(val reason: String) : MutationDecision
}

object MutationGate {
    fun evaluate(
        connection: ConnectionState,
        permission: AppPermission,
        snapshot: PermissionSnapshot,
    ): MutationDecision = when {
        connection == ConnectionState.Offline -> MutationDecision.Denied("网络不可用，当前为只读模式")
        !snapshot.allows(permission) -> MutationDecision.Denied("当前账号无此操作权限")
        else -> MutationDecision.Allowed
    }
}
```

- [ ] **Step 4: Run both test classes**

Expected: all permission and gate tests pass.

- [ ] **Step 5: Commit and push**

```powershell
git add android-client/app/src/main android-client/app/src/test
git commit -m "feat: add Android permission and mutation policies"
git push origin codex/android-mobile-ui-atlas
```

---

### Task 3: Session and Real Connectivity State

**Files:**
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/network/NetworkMonitor.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/network/AndroidConnectivityNetworkMonitor.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/session/AppSession.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/session/SessionRepository.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/session/InMemorySessionRepository.kt`
- Test: `android-client/app/src/test/java/com/chengxu/autoservice/core/session/InMemorySessionRepositoryTest.kt`

**Interfaces:**
- Produces: `NetworkMonitor.connection: StateFlow<ConnectionState>` and `SessionRepository.session: StateFlow<AppSession>`.

- [ ] **Step 1: Write the failing session test**

```kotlin
@Test fun roleUpdateRebuildsPermissionSnapshot() = runTest {
    val repository = InMemorySessionRepository(employeeSession())
    repository.setDebugRole(UserRole.ADMINISTRATOR)
    assertEquals(UserRole.ADMINISTRATOR, repository.session.value.role)
    assertTrue(repository.session.value.permissions.allows(AppPermission.SETTLE_ORDER))
}
```

- [ ] **Step 2: Run the focused test and confirm missing repository types**

```powershell
.\gradlew.bat :app:testDebugUnitTest --tests "*.InMemorySessionRepositoryTest"
```

- [ ] **Step 3: Implement session state and connectivity callbacks**

```kotlin
data class AppSession(
    val companyName: String,
    val staffName: String,
    val role: UserRole,
    val permissions: PermissionSnapshot,
)

interface SessionRepository {
    val session: StateFlow<AppSession>
}

class InMemorySessionRepository(initial: AppSession) : SessionRepository {
    private val mutableSession = MutableStateFlow(initial)
    override val session: StateFlow<AppSession> = mutableSession.asStateFlow()

    fun setDebugRole(role: UserRole) {
        mutableSession.update { it.copy(role = role, permissions = PermissionSnapshot.forRole(role)) }
    }
}

interface NetworkMonitor {
    val connection: StateFlow<ConnectionState>
}
```

`AndroidConnectivityNetworkMonitor` must use `ConnectivityManager.registerDefaultNetworkCallback`, emit `Online` on `onAvailable`, emit `Offline` on `onLost`/`onUnavailable`, unregister with `awaitClose`, and expose the callback flow with `stateIn(applicationScope, SharingStarted.Eagerly, initialState)`.

- [ ] **Step 4: Run session tests and the debug build**

```powershell
.\gradlew.bat :app:testDebugUnitTest :app:assembleDebug
```

Expected: tests pass and the manifest needs no runtime permission prompt.

- [ ] **Step 5: Commit and push**

```powershell
git add android-client/app/src
git commit -m "feat: add Android session and connectivity state"
git push origin codex/android-mobile-ui-atlas
```

---

### Task 4: Design System and Offline Components

**Files:**
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/designsystem/AutoserviceTokens.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/designsystem/AutoserviceTheme.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/designsystem/AutoserviceComponents.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/ui/shell/OfflineBanner.kt`
- Test: `android-client/app/src/androidTest/java/com/chengxu/autoservice/DesignSystemTest.kt`

**Interfaces:**
- Produces: `AutoserviceTheme`, `AutoserviceCard`, `MetricCard`, `StatusChip`, `OfflineBanner`.

- [ ] **Step 1: Write the failing offline-banner UI test**

```kotlin
@get:Rule val composeRule = createComposeRule()

@Test fun offlineBannerNamesTheReadOnlyState() {
    composeRule.setContent { AutoserviceTheme { OfflineBanner() } }
    composeRule.onNodeWithText("网络不可用，当前为只读模式").assertIsDisplayed()
}
```

- [ ] **Step 2: Run the instrumentation test and confirm unresolved composables**

```powershell
.\gradlew.bat :app:compileDebugAndroidTestKotlin
```

Expected: compilation fails because theme and banner do not exist.

- [ ] **Step 3: Implement the approved visual tokens**

```kotlin
object AutoserviceColors {
    val Background = Color(0xFFF5F7FA)
    val Surface = Color(0xFFFFFFFF)
    val Primary = Color(0xFF1677FF)
    val TextPrimary = Color(0xFF172033)
    val TextSecondary = Color(0xFF667085)
    val TextMuted = Color(0xFF98A2B3)
    val Border = Color(0xFFE4EAF2)
    val Success = Color(0xFF12A05C)
    val Warning = Color(0xFFFF8A00)
    val Danger = Color(0xFFFF3B30)
}

object AutoserviceSpacing {
    val Xs = 4.dp
    val Sm = 8.dp
    val Md = 12.dp
    val Lg = 16.dp
    val Xl = 24.dp
}

val AutoserviceShape = RoundedCornerShape(8.dp)
```

Use system Chinese fonts, zero letter spacing, subtle border-based elevation, no gradients, and no nested cards. `OfflineBanner` uses an icon plus the exact read-only text.

```kotlin
@Composable
fun OfflineBanner(modifier: Modifier = Modifier) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .background(Color(0xFFFFF7E8))
            .padding(horizontal = 16.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Icon(Icons.Outlined.CloudOff, contentDescription = null, tint = AutoserviceColors.Warning)
        Text(
            text = "网络不可用，当前为只读模式",
            color = AutoserviceColors.TextPrimary,
            style = MaterialTheme.typography.bodyMedium,
        )
    }
}
```

- [ ] **Step 4: Compile Android tests and inspect previews at 390 x 844**

```powershell
.\gradlew.bat :app:compileDebugAndroidTestKotlin :app:assembleDebug
```

- [ ] **Step 5: Commit and push**

```powershell
git add android-client/app/src
git commit -m "feat: add Android light technology design system"
git push origin codex/android-mobile-ui-atlas
```

---

### Task 5: Five-Tab Navigation 3 Shell

**Files:**
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/navigation/AppRoute.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/navigation/RootTab.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/navigation/AppNavigationState.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/navigation/AppNavDisplay.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/ui/shell/AutoserviceShell.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/ui/stage/StageScreen.kt`
- Test: `android-client/app/src/test/java/com/chengxu/autoservice/navigation/AppNavigationStateTest.kt`
- Test: `android-client/app/src/androidTest/java/com/chengxu/autoservice/AutoserviceShellTest.kt`

**Interfaces:**
- Consumes: `ConnectionState`, `MutationGate`, design-system components.
- Produces: `AppNavigationState.select(RootTab)`, `AppNavDisplay`, and fixed five-tab shell semantics.

- [ ] **Step 1: Write failing navigation-state tests**

```kotlin
@Test fun tabsRemainInApprovedOrder() {
    assertEquals(
        listOf("工作台", "工单", "新增", "档案", "我的"),
        RootTab.entries.map(RootTab::label),
    )
}

@Test fun reselectingCurrentTabReturnsItsStackToRoot() {
    val state = AppNavigationState()
    state.push(AppRoute.OrderDetail("RO-1"))
    state.select(RootTab.WORKBENCH)
    assertEquals(listOf(AppRoute.Workbench), state.currentStack)
}
```

- [ ] **Step 2: Run tests and confirm missing route/state types**

```powershell
.\gradlew.bat :app:testDebugUnitTest --tests "*.AppNavigationStateTest"
```

- [ ] **Step 3: Implement typed routes and independent tab stacks**

```kotlin
@Serializable
sealed interface AppRoute : NavKey {
    @Serializable data object Workbench : AppRoute
    @Serializable data object Orders : AppRoute
    @Serializable data object CreateOrder : AppRoute
    @Serializable data object Records : AppRoute
    @Serializable data object Profile : AppRoute
    @Serializable data class OrderDetail(val orderId: String) : AppRoute
}

enum class RootTab(val label: String, val root: AppRoute) {
    WORKBENCH("工作台", AppRoute.Workbench),
    ORDERS("工单", AppRoute.Orders),
    CREATE("新增", AppRoute.CreateOrder),
    RECORDS("档案", AppRoute.Records),
    PROFILE("我的", AppRoute.Profile),
}
```

`AppNavigationState` owns one mutable stack per `RootTab`. `select()` swaps tabs; selecting the active tab clears only that tab to its root. `AppNavDisplay` resolves every root route and the order-detail test route. Stage screens say “该模块将在后续阶段接入” and never expose a write action.

- [ ] **Step 4: Add shell UI assertions**

```kotlin
@Test fun centerCreateTabIsThirdAndDisabledOffline() {
    launchShell(connection = ConnectionState.Offline)
    composeRule.onAllNodesWithTag("root-tab").assertCountEquals(5)
    composeRule.onNodeWithText("新增").assertIsNotEnabled()
    composeRule.onNodeWithText("网络不可用，当前为只读模式").assertIsDisplayed()
}
```

- [ ] **Step 5: Run unit and instrumentation compilation/tests**

```powershell
.\gradlew.bat :app:testDebugUnitTest :app:compileDebugAndroidTestKotlin :app:assembleDebug
```

- [ ] **Step 6: Commit and push**

```powershell
git add android-client/app/src docs/latest-handoff-prompt.md
git commit -m "feat: add Android five-tab navigation shell"
git push origin codex/android-mobile-ui-atlas
```

---

### Task 6: Workbench State and ViewModel

**Files:**
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/ui/workbench/WorkbenchModels.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/ui/workbench/WorkbenchRepository.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/ui/workbench/DemoWorkbenchRepository.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/ui/workbench/WorkbenchViewModel.kt`
- Test: `android-client/app/src/test/java/com/chengxu/autoservice/ui/workbench/WorkbenchViewModelTest.kt`

**Interfaces:**
- Consumes: `SessionRepository.session`, `NetworkMonitor.connection`.
- Produces: `WorkbenchUiState` with role-specific sections and allowed quick actions.

- [ ] **Step 1: Write failing employee/admin state tests**

```kotlin
@Test fun employeeStateOmitsSettlementAction() = runTest {
    val viewModel = createViewModel(UserRole.EMPLOYEE, ConnectionState.Online)
    val state = viewModel.uiState.first { !it.loading }
    assertEquals("今日工作", state.title)
    assertFalse(state.quickActions.any { it.permission == AppPermission.SETTLE_ORDER })
}

@Test fun administratorStateContainsBusinessSummaryAndSettlement() = runTest {
    val viewModel = createViewModel(UserRole.ADMINISTRATOR, ConnectionState.Online)
    val state = viewModel.uiState.first { !it.loading }
    assertEquals("管理员工作台", state.title)
    assertTrue(state.sections.contains(WorkbenchSection.BUSINESS_SUMMARY))
    assertTrue(state.quickActions.any { it.permission == AppPermission.SETTLE_ORDER })
}
```

- [ ] **Step 2: Run the focused tests and confirm missing workbench types**

```powershell
.\gradlew.bat :app:testDebugUnitTest --tests "*.WorkbenchViewModelTest"
```

- [ ] **Step 3: Implement stable workbench models and deterministic demo data**

```kotlin
enum class WorkbenchSection { TODAY_QUEUE, ORDER_STATUS, BUSINESS_SUMMARY }

data class WorkbenchMetric(val label: String, val value: String, val tone: MetricTone)

data class WorkbenchAction(
    val label: String,
    val permission: AppPermission,
)

data class WorkbenchUiState(
    val loading: Boolean = true,
    val title: String = "",
    val subtitle: String = "",
    val metrics: List<WorkbenchMetric> = emptyList(),
    val sections: List<WorkbenchSection> = emptyList(),
    val quickActions: List<WorkbenchAction> = emptyList(),
    val connection: ConnectionState = ConnectionState.Online,
)
```

Use two deterministic Chinese demo orders derived from the approved atlas. `WorkbenchViewModel` combines session, connection, and repository flows. It filters every quick action through `PermissionSnapshot` and supplies the connection state to `MutationGate`; Composables do not infer permissions from role labels.

- [ ] **Step 4: Run the view-model and full JVM test suites**

```powershell
.\gradlew.bat :app:testDebugUnitTest
```

Expected: all JVM tests pass without Android framework dependencies.

- [ ] **Step 5: Commit and push**

```powershell
git add android-client/app/src
git commit -m "feat: add role-aware Android workbench state"
git push origin codex/android-mobile-ui-atlas
```

---

### Task 7: Employee and Administrator Workbench UI

**Files:**
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/ui/workbench/WorkbenchScreen.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/ui/workbench/WorkbenchComponents.kt`
- Test: `android-client/app/src/androidTest/java/com/chengxu/autoservice/WorkbenchScreenTest.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/navigation/AppNavDisplay.kt`

**Interfaces:**
- Consumes: `WorkbenchUiState`, `MutationDecision`.
- Produces: atlas-aligned employee/admin workbench semantics and responsive layouts from 360dp through 412dp.

- [ ] **Step 1: Write failing role and layout UI tests**

```kotlin
@Test fun employeeWorkbenchShowsTodayWorkWithoutSettlement() {
    setWorkbench(employeeState())
    composeRule.onNodeWithText("今日工作").assertIsDisplayed()
    composeRule.onNodeWithText("办理结算").assertDoesNotExist()
}

@Test fun administratorWorkbenchShowsSummaryAndSettlement() {
    setWorkbench(adminState())
    composeRule.onNodeWithText("管理员工作台").assertIsDisplayed()
    composeRule.onNodeWithText("经营摘要").assertIsDisplayed()
    composeRule.onNodeWithText("办理结算").assertIsDisplayed()
}

@Test fun longChineseCopyDoesNotCreateHorizontalScrolling() {
    setWorkbench(adminState(companyName = "鄂尔多斯市鑫齐恒汽车服务有限公司"), widthDp = 360)
    composeRule.onRoot().assertWidthIsEqualTo(360.dp)
    composeRule.onNodeWithText("鄂尔多斯市鑫齐恒汽车服务有限公司").assertIsDisplayed()
}
```

- [ ] **Step 2: Compile Android tests and confirm missing workbench Composables**

```powershell
.\gradlew.bat :app:compileDebugAndroidTestKotlin
```

- [ ] **Step 3: Implement atlas-aligned workbenches**

Build one vertically scrolling page with:

```kotlin
@Composable
fun WorkbenchScreen(
    state: WorkbenchUiState,
    onAction: (WorkbenchAction) -> Unit,
    modifier: Modifier = Modifier,
)
```

Employee order: greeting/header, today queue, status metrics, recent orders. Administrator order: title/header, business summary, settlement/insurance priorities, recent orders. Cards use 8dp radius, 16dp outer padding, 12dp internal gaps, stable heights, and no nested card surfaces. A denied action displays the exact `MutationDecision.Denied.reason` in a Material 3 snackbar.

- [ ] **Step 4: Run UI tests on three width configurations**

```powershell
.\gradlew.bat :app:connectedDebugAndroidTest
```

Expected: employee/admin/offline tests pass at 360dp, 390dp, and 412dp; no horizontal scroll container exists.

- [ ] **Step 5: Capture emulator screenshots and compare with approved PNGs**

Capture employee and administrator states, then compare them manually with:

```text
design/mobile-ui/output/workbench-employee.png
design/mobile-ui/output/workbench-admin.png
```

Reject the task if title hierarchy, tab geometry, card spacing, offline banner, or action visibility differs materially.

- [ ] **Step 6: Commit and push**

```powershell
git add android-client/app/src docs/latest-handoff-prompt.md
git commit -m "feat: build Android employee and admin workbenches"
git push origin codex/android-mobile-ui-atlas
```

---

### Task 8: Application Wiring, Debug-Only Role Injection, and Emulator QA

**Files:**
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/AutoserviceApp.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/MainActivity.kt`
- Modify: `android-client/app/src/main/AndroidManifest.xml`
- Test: `android-client/app/src/androidTest/java/com/chengxu/autoservice/AutoserviceAppTest.kt`

**Interfaces:**
- Consumes: shell, real network monitor, in-memory session, workbench repository.
- Produces: a launchable debug APK and release behavior with no visible role-switch control.

- [ ] **Step 1: Write failing app-level tests**

```kotlin
@Test fun debugAdminIntentLaunchesAdminWorkbench() {
    launchActivity<MainActivity>(intentWithDemoRole("admin"))
    composeRule.onNodeWithText("管理员工作台").assertIsDisplayed()
}

@Test fun employeeLaunchDoesNotExposeRoleSwitchText() {
    launchActivity<MainActivity>(intentWithDemoRole("employee"))
    composeRule.onNodeWithText("切换角色").assertDoesNotExist()
    composeRule.onNodeWithText("办理结算").assertDoesNotExist()
}
```

- [ ] **Step 2: Compile tests and confirm missing application wiring**

```powershell
.\gradlew.bat :app:compileDebugAndroidTestKotlin
```

- [ ] **Step 3: Wire repositories and a debug-only intent override**

`MainActivity` reads the `demo_role` intent extra only when `BuildConfig.DEBUG` is true. Accepted values are `employee` and `admin`; absent or invalid values use employee. There is no role selector in the visible app. `AutoserviceApp` receives repository interfaces as parameters so UI tests bypass Android connectivity callbacks.

```kotlin
private fun resolveDemoRole(intent: Intent, debug: Boolean): UserRole {
    if (!debug) return UserRole.EMPLOYEE
    return when (intent.getStringExtra("demo_role")) {
        "admin" -> UserRole.ADMINISTRATOR
        else -> UserRole.EMPLOYEE
    }
}
```

- [ ] **Step 4: Build, install, and run deterministic adb checks**

```powershell
.\gradlew.bat clean :app:testDebugUnitTest :app:assembleDebug :app:connectedDebugAndroidTest
adb install -r app\build\outputs\apk\debug\app-debug.apk
adb shell am force-stop com.chengxu.autoservice
adb shell am start -n com.chengxu.autoservice/.MainActivity --es demo_role employee
adb shell am force-stop com.chengxu.autoservice
adb shell am start -n com.chengxu.autoservice/.MainActivity --es demo_role admin
```

Verify through the UI tree: five tabs exist, employee lacks settlement, administrator has settlement, and no visible role switch exists.

- [ ] **Step 5: Verify real offline read-only behavior**

Disable emulator Wi-Fi and mobile data, relaunch the app, and assert “网络不可用，当前为只读模式” is present and 新增 is disabled. Restore networking and assert the banner disappears without restarting the app.

- [ ] **Step 6: Commit and push**

```powershell
git add android-client/app/src android-client/app/src/androidTest docs/latest-handoff-prompt.md
git commit -m "feat: wire Android foundation application"
git push origin codex/android-mobile-ui-atlas
```

---

### Task 9: Operator Documentation and Final Verification

**Files:**
- Create: `docs/android-client.md`
- Modify: `README.md`
- Modify: `docs/latest-handoff-prompt.md`

**Interfaces:**
- Produces: reproducible build/run/handoff instructions for another machine or Codex account.

- [ ] **Step 1: Write the documentation contract checklist**

The document must contain all of these literal headings:

```text
环境要求
首次构建
运行测试
安装调试 APK
调试角色预览
断网验证
正式发布前检查
换电脑接力
```

- [ ] **Step 2: Add exact build and QA commands**

Document JDK 17, Android SDK platform 36, an API 26+ device/emulator, `gradlew.bat`, the debug-only `demo_role` extra, and the rule that release package/signing must be confirmed before publication. State explicitly that stage one contains no API/COS/Room data persistence.

- [ ] **Step 3: Run the complete verification matrix**

```powershell
cd android-client
.\gradlew.bat clean :app:testDebugUnitTest :app:assembleDebug :app:connectedDebugAndroidTest
cd ..
npm.cmd test
npm.cmd run build
git diff --check
git status --short
```

Expected: Android unit/UI tests pass, APK builds, existing 64 web/business tests pass, web production build passes, and only intended documentation changes remain.

- [ ] **Step 4: Confirm release exclusions**

Search the release source and built resources:

```powershell
rg -n "切换角色|demo_role|888888|TENCENT_SECRET|SECRET_KEY" android-client/app/src/main
```

Expected: `demo_role` appears only in guarded debug intent code; no access-code hint, secret key, or visible role-switch copy exists.

- [ ] **Step 5: Commit, push, and record final handoff**

```powershell
git add README.md docs/android-client.md docs/latest-handoff-prompt.md
git commit -m "docs: document Android foundation workflow"
git push origin codex/android-mobile-ui-atlas
```

Final handoff must name the latest commit, APK path, passing test counts, remaining production exclusions, and the next recommended milestone: real login/session API integration.
