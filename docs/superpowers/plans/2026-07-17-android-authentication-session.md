# Android Authentication and Session Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add production account/password authentication, encrypted 12-hour local session restoration, automatic 401 invalidation, and logout to the independent Android client.

**Architecture:** A focused `core/auth` boundary owns API calls, Keystore encryption, local persistence, and explicit restoring/unauthenticated/authenticated state. The application root renders authentication before the existing navigation shell, while later authenticated API clients receive their Bearer token from this single boundary.

**Tech Stack:** Kotlin 2.3.21, Compose Material 3, Navigation 3, Kotlinx Serialization JSON 1.11.0, `HttpURLConnection`, Android Keystore AES/GCM, SharedPreferences, coroutines, JUnit 4.

## Global Constraints

- Android stays in `android-client/`; do not modify webpage layouts or service authentication contracts.
- Only `companyId + username + password` login is in scope; no access-code login or refresh-token endpoint.
- Release API origin is `https://chengxu.pages.dev`; Debug origin is an uncommitted Gradle property override.
- Store only AES/GCM-encrypted session data using a non-exportable Android Keystore key. Do not save passwords or log tokens.
- HTTP 401 clears local state and routes to login. Unknown server permissions grant no Android permission.
- Do not launch an Android emulator. Run JVM tests, Android test-code compilation, lint and Debug APK build; copy the artifact to `dist/releases/android/`.
- After every task, update `docs/latest-handoff-prompt.md`, commit, and push.

## File Structure

- `android-client/gradle/libs.versions.toml`, `android-client/app/build.gradle.kts`, `android-client/app/src/main/AndroidManifest.xml`: JSON support, API origin, and network permission.
- `android-client/app/src/main/java/com/chengxu/autoservice/core/auth/`: contracts, mapper, transport, cipher, encrypted store, repository and state.
- `android-client/app/src/main/java/com/chengxu/autoservice/core/session/`: authenticated session and server permission mapping.
- `android-client/app/src/main/java/com/chengxu/autoservice/ui/auth/`: login ViewModel and screen.
- `android-client/app/src/main/java/com/chengxu/autoservice/ui/profile/ProfileScreen.kt`: profile and logout action.
- `android-client/app/src/main/java/com/chengxu/autoservice/AutoserviceApp.kt`, `MainActivity.kt`, `navigation/AppNavDisplay.kt`, `ui/shell/AutoserviceShell.kt`: root state, composition and logout injection.
- `android-client/app/src/test/java/com/chengxu/autoservice/core/auth/` and `android-client/app/src/androidTest/java/com/chengxu/autoservice/AutoserviceAppTest.kt`: unit and Compose compile coverage.

---

### Task 1: Define the server contract and authenticated session mapping

**Files:**
- Modify: `android-client/gradle/libs.versions.toml`
- Modify: `android-client/app/build.gradle.kts`
- Modify: `android-client/app/src/main/AndroidManifest.xml`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/core/session/AppSession.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/core/session/PermissionSnapshot.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/auth/AuthContracts.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/auth/SessionMapper.kt`
- Test: `android-client/app/src/test/java/com/chengxu/autoservice/core/auth/SessionMapperTest.kt`

**Interfaces:**
- Produces `AuthCredentials(companyId, username, password)`, serializable `RemoteSession`, `RemoteSession.toAppSession()`, and `PermissionSnapshot.fromServer(role, permissionKeys)`.
- `AppSession` gains `companyId`, `username`, and `token`; `AppPermission` remains the sole UI authorization type.

- [x] **Step 1: Write the failing mapper tests**

```kotlin
@Test fun staffMapsOnlyKnownReturnedPermissions() {
    val result = remote(role = "staff", permissions = listOf("repair", "unknown", "voidOrder")).toAppSession()
    assertEquals(UserRole.EMPLOYEE, result.role)
    assertTrue(result.permissions.allows(AppPermission.CREATE_ORDER))
    assertTrue(result.permissions.allows(AppPermission.VOID_ORDER))
    assertFalse(result.permissions.allows(AppPermission.SETTLE_ORDER))
}

@Test fun adminMapsToAllAndroidPermissions() {
    val permissions = remote(role = "admin", permissions = emptyList()).toAppSession().permissions
    assertTrue(AppPermission.entries.all(permissions::allows))
}
```

- [x] **Step 2: Prove the test fails**

Run: `cd android-client; .\gradlew.bat :app:testDebugUnitTest --tests "com.chengxu.autoservice.core.auth.SessionMapperTest"`

Expected: compilation fails because `RemoteSession` and `toAppSession` do not exist.

- [x] **Step 3: Add the smallest contract implementation**

```kotlin
@Serializable
data class RemoteSession(
    val token: String,
    val role: String,
    val companyId: String,
    val username: String,
    val displayName: String,
    val permissions: List<String> = emptyList(),
)

fun RemoteSession.toAppSession() = AppSession(
    companyId = companyId, companyName = companyNameFor(companyId), username = username,
    staffName = displayName, token = token,
    role = if (role == "admin") UserRole.ADMINISTRATOR else UserRole.EMPLOYEE,
    permissions = PermissionSnapshot.fromServer(role, permissions),
)
```

Add the JSON catalog alias for `org.jetbrains.kotlinx:kotlinx-serialization-json:1.11.0`, `BuildConfig.API_ORIGIN`, Debug `-PapiOrigin` support, and `android.permission.INTERNET`.

- [x] **Step 4: Verify and commit**

Run: `cd android-client; .\gradlew.bat :app:testDebugUnitTest --tests "com.chengxu.autoservice.core.auth.SessionMapperTest" :app:testDebugUnitTest`

Expected: all JVM tests pass.

```powershell
git add android-client/gradle/libs.versions.toml android-client/app/build.gradle.kts android-client/app/src/main/AndroidManifest.xml android-client/app/src/main/java/com/chengxu/autoservice/core/session android-client/app/src/main/java/com/chengxu/autoservice/core/auth android-client/app/src/test/java/com/chengxu/autoservice/core/auth docs/latest-handoff-prompt.md
git commit -m "feat: define Android authenticated session contract"
git push origin codex/android-mobile-ui-atlas
```

### Task 2: Add AES/GCM persistence and the authentication repository

**Files:**
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/auth/SessionCipher.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/auth/EncryptedSessionStore.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/auth/AuthApi.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/auth/AuthenticationRepository.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/core/session/SessionRepository.kt`
- Test: `android-client/app/src/test/java/com/chengxu/autoservice/core/auth/AuthenticationRepositoryTest.kt`
- Test: `android-client/app/src/test/java/com/chengxu/autoservice/core/auth/EncryptedSessionStoreTest.kt`

**Interfaces:**

```kotlin
interface AuthApi { suspend fun login(credentials: AuthCredentials): AuthResult }
interface SessionStore { suspend fun read(): AppSession?; suspend fun write(session: AppSession); suspend fun clear() }
sealed interface AuthenticationState {
    data object Restoring : AuthenticationState
    data class Unauthenticated(val message: String? = null) : AuthenticationState
    data class Authenticated(val session: AppSession) : AuthenticationState
}
```

`AuthenticationRepository` also implements `SessionRepository`, whose `session` changes to `StateFlow<AppSession?>`.

- [x] **Step 1: Write failing repository tests using fakes**

```kotlin
@Test fun successfulLoginPersistsMappedSessionAndPublishesAuthenticated() = runTest {
    val repository = repository(api = FakeAuthApi(success = remote()), store = FakeStore())
    repository.login(AuthCredentials("tongda", "worker", "secret12"))
    assertTrue(repository.state.value is AuthenticationState.Authenticated)
}

@Test fun expiryClearsPersistedSessionAndReturnsToLogin() = runTest {
    val store = FakeStore(remote().toAppSession())
    val repository = repository(store = store)
    repository.invalidate(AuthFailure.SessionExpired)
    assertNull(store.read())
    assertEquals(AuthenticationState.Unauthenticated("登录已过期，请重新登录"), repository.state.value)
}
```

- [x] **Step 2: Prove the test fails**

Run: `cd android-client; .\gradlew.bat :app:testDebugUnitTest --tests "com.chengxu.autoservice.core.auth.AuthenticationRepositoryTest"`

Expected: compilation fails because the repository, API and store contracts do not exist.

- [x] **Step 3: Implement one boundary at a time**

Implement `HttpUrlConnectionAuthApi` with POST JSON, 10-second timeouts, `https://chengxu.pages.dev/api/access`, and distinct failures for offline/network, invalid account, malformed response and expired session. Implement a non-exportable AndroidKeyStore AES key with a 12-byte random GCM IV; persist one Base64 `iv + ciphertext` record in private SharedPreferences. Use `AuthenticationRepository.restore()`, `login()`, `logout()`, and `invalidate()` to map persistence/API outcomes into `AuthenticationState`; clear storage on every 401 and never persist the password.

- [x] **Step 4: Verify and commit**

Run: `cd android-client; .\gradlew.bat :app:testDebugUnitTest --tests "com.chengxu.autoservice.core.auth.*" :app:testDebugUnitTest`

Expected: all JVM tests pass, including logout and no-password persistence cases.

```powershell
git add android-client/app/src/main/java/com/chengxu/autoservice/core/auth android-client/app/src/main/java/com/chengxu/autoservice/core/session android-client/app/src/test/java/com/chengxu/autoservice/core/auth docs/latest-handoff-prompt.md
git commit -m "feat: add encrypted Android authentication repository"
git push origin codex/android-mobile-ui-atlas
```

### Task 3: Render login before the shell and add profile logout

**Files:**
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/ui/auth/LoginViewModel.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/ui/auth/LoginScreen.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/ui/profile/ProfileScreen.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/AutoserviceApp.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/MainActivity.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/navigation/AppNavDisplay.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/ui/shell/AutoserviceShell.kt`
- Test: `android-client/app/src/androidTest/java/com/chengxu/autoservice/AutoserviceAppTest.kt`

**Interfaces:** `AutoserviceApp` consumes `AuthenticationRepository.state`; `AppNavDisplay` and `AutoserviceShell` receive `onLogout: () -> Unit`; only the authenticated branch creates `WorkbenchViewModel`.

- [x] **Step 1: Write failing root-switch tests**

```kotlin
@Test fun unauthenticatedRootShowsLogin() {
    setApp(AuthenticationState.Unauthenticated())
    composeRule.onNodeWithText("登录").assertIsDisplayed()
    composeRule.onNodeWithText("公司").assertIsDisplayed()
}

@Test fun authenticatedProfileOffersLogout() {
    setApp(AuthenticationState.Authenticated(employeeSession()))
    composeRule.onNodeWithText("员工工作台").assertIsDisplayed()
    composeRule.onNodeWithText("退出登录").assertIsDisplayed()
}
```

- [x] **Step 2: Prove the Android test code does not compile yet**

Run: `cd android-client; .\gradlew.bat :app:compileDebugAndroidTestKotlin`

Expected: compilation fails because the login root and logout control do not exist.

- [x] **Step 3: Implement the UI and application assembly**

Build the login UI with exactly two companies (`tongda` and `xinqiheng`), username, masked password, duplicate-submit disabling, `登录中…` and readable validation/network/server errors. During `Restoring`, show only a non-sensitive progress indicator; during `Unauthenticated`, show `LoginScreen`; during `Authenticated`, show the existing shell. Replace only `AppRoute.Profile` with `ProfileScreen` and wire its `退出登录` callback. `MainActivity` constructs the real auth repository and removes the debug role assembly.

- [x] **Step 4: Verify and commit**

Run: `cd android-client; .\gradlew.bat :app:compileDebugAndroidTestKotlin :app:testDebugUnitTest`

Expected: Android test code compiles and all JVM tests pass. Do not execute instrumentation tests or start an emulator.

```powershell
git add android-client/app/src/main/java/com/chengxu/autoservice/AutoserviceApp.kt android-client/app/src/main/java/com/chengxu/autoservice/MainActivity.kt android-client/app/src/main/java/com/chengxu/autoservice/ui/auth android-client/app/src/main/java/com/chengxu/autoservice/ui/profile android-client/app/src/main/java/com/chengxu/autoservice/navigation android-client/app/src/main/java/com/chengxu/autoservice/ui/shell android-client/app/src/androidTest/java/com/chengxu/autoservice/AutoserviceAppTest.kt docs/latest-handoff-prompt.md
git commit -m "feat: add Android login and logout flow"
git push origin codex/android-mobile-ui-atlas
```

### Task 4: Complete non-emulator verification and package a phone APK

**Files:**
- Modify: `docs/android-client.md`
- Modify: `docs/latest-handoff-prompt.md`
- Output: `dist/releases/android/autoservice-android-debug-0.1.0.apk`

- [x] **Step 1: Add the missing deterministic regression if required**

```kotlin
@Test fun logoutClearsSessionAndReturnsUnauthenticated() = runTest {
    val store = FakeStore(remote().toAppSession())
    val repository = repository(store = store)
    repository.logout()
    assertNull(store.read())
    assertTrue(repository.state.value is AuthenticationState.Unauthenticated)
}
```

- [x] **Step 2: Run the complete required verification**

```powershell
$env:JAVA_HOME='E:\codex\APP\.android-build\jdk\jdk-17.0.19+10'
$env:ANDROID_HOME='E:\codex\APP\.android-build\android-sdk'
cd E:\codex\chengxu\android-client
.\gradlew.bat clean :app:testDebugUnitTest :app:compileDebugAndroidTestKotlin :app:lintDebug :app:assembleDebug
```

Expected: `BUILD SUCCESSFUL`; no emulator command is run.

- [x] **Step 3: Copy the APK and calculate its SHA-256**

```powershell
Copy-Item -LiteralPath E:\codex\chengxu\android-client\app\build\outputs\apk\debug\app-debug.apk -Destination E:\codex\chengxu\dist\releases\android\autoservice-android-debug-0.1.0.apk -Force
Get-FileHash -Algorithm SHA256 E:\codex\chengxu\dist\releases\android\autoservice-android-debug-0.1.0.apk
```

- [x] **Step 4: Document and commit**

Document real-phone login for both companies, invalid password, restart within 12 hours, logout, expired-session reauthentication and offline login rejection. State that verification did not use an emulator.

```powershell
git add docs/android-client.md docs/latest-handoff-prompt.md
git commit -m "docs: verify Android authentication release workflow"
git push origin codex/android-mobile-ui-atlas
```

## Plan Self-Review

- Spec coverage: Tasks 1–3 cover direct HTTPS authentication, encrypted session recovery, roles/permissions, 401 invalidation, login root and logout. Task 4 covers the required build and phone artifact.
- Placeholder scan: no unresolved implementation markers or unspecified tests remain.
- Type consistency: `RemoteSession.toAppSession`, `AuthenticationState`, `AuthenticationRepository`, `AuthApi`, `SessionStore`, and nullable `SessionRepository.session` use the same names in every task.
