# Android Keystore Login Crash Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the production AndroidKeyStore AES-GCM login crash and keep future session-persistence failures from terminating the app.

**Architecture:** Let the selected JCA provider generate the encryption IV, then persist `cipher.iv + ciphertext` in the existing Base64 format; decryption continues to supply the stored IV. Treat session persistence as part of authentication success: publish an authenticated session only after storage succeeds, otherwise return a readable unauthenticated state.

**Tech Stack:** Kotlin 2.3.21, AndroidKeyStore, JCA `AES/GCM/NoPadding`, kotlinx.coroutines test, JUnit 4, AndroidX Test, Gradle 8.13/AGP 8.13.2.

## Global Constraints

- Preserve AES-256-GCM, the non-exportable AndroidKeyStore key, random 12-byte IVs, and the existing `Base64(iv + ciphertext)` format.
- Do not change the production API, credential contract, 12-hour session lifetime, or Navigation 3 shell.
- Never log passwords, tokens, ciphertext, keys, or raw persistence exceptions.
- Write and observe each regression test failing before production edits.
- After each important change, update `docs/latest-handoff-prompt.md`, commit, and push `codex/android-mobile-ui-atlas`.

---

### Task 1: Provider-generated AndroidKeyStore IV

**Files:**
- Create: `android-client/app/src/androidTest/java/com/chengxu/autoservice/core/auth/AndroidKeystoreSessionCipherTest.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/core/auth/SessionCipher.kt`
- Verify: `android-client/app/src/test/java/com/chengxu/autoservice/core/auth/EncryptedSessionStoreTest.kt`
- Modify: `docs/latest-handoff-prompt.md`

**Interfaces:**
- Consumes: `androidKeystoreSessionCipher(alias: String): SessionCipher` and `SessionCipher.encrypt/decrypt`.
- Produces: `AesGcmSessionCipher.encrypt` payloads whose first 12 decoded bytes are the provider-generated IV; the ciphertext format and decrypt API remain unchanged.

- [ ] **Step 1: Write the failing real-AndroidKeyStore test**

```kotlin
package com.chengxu.autoservice.core.auth

import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Test
import org.junit.runner.RunWith
import java.security.KeyStore
import java.util.UUID

@RunWith(AndroidJUnit4::class)
class AndroidKeystoreSessionCipherTest {
    @Test
    fun providerGeneratedIvEncryptsAndDecryptsWithAndroidKeystore() {
        val alias = "autoservice_session_test_${UUID.randomUUID()}"
        try {
            val cipher = androidKeystoreSessionCipher(alias)
            val first = cipher.encrypt("session-token")
            val second = cipher.encrypt("session-token")

            assertNotEquals(first, second)
            assertEquals("session-token", cipher.decrypt(first))
            assertEquals("session-token", cipher.decrypt(second))
        } finally {
            KeyStore.getInstance("AndroidKeyStore").apply {
                load(null)
                deleteEntry(alias)
            }
        }
    }
}
```

- [ ] **Step 2: Run the test and verify the original defect**

Run from `E:\codex\chengxu\android-client`:

```powershell
$env:JAVA_HOME='E:\codex\APP\.android-build\jdk\jdk-17.0.19+10'
$env:ANDROID_HOME='E:\codex\APP\.android-build\android-sdk'
.\gradlew.bat :app:connectedDebugAndroidTest "-Pandroid.testInstrumentationRunnerArguments.class=com.chengxu.autoservice.core.auth.AndroidKeystoreSessionCipherTest"
```

Expected: FAIL with `InvalidAlgorithmParameterException: Caller-provided IV not permitted` from `AesGcmSessionCipher.encrypt`.

- [ ] **Step 3: Make encryption use the provider IV**

In `SessionCipher.kt`, remove the `SecureRandom` import and constructor dependency. Replace `encrypt` with:

```kotlin
override fun encrypt(plaintext: String): String {
    val cipher = Cipher.getInstance(TRANSFORMATION).apply {
        init(Cipher.ENCRYPT_MODE, keyProvider())
    }
    val iv = cipher.iv
    require(iv.size == IV_SIZE_BYTES) { "AES-GCM provider returned an invalid IV" }
    val encrypted = cipher.doFinal(plaintext.toByteArray(Charsets.UTF_8))
    return Base64.getEncoder().encodeToString(iv + encrypted)
}
```

Keep `decrypt`, `IV_SIZE_BYTES = 12`, and `TAG_SIZE_BITS = 128` unchanged.

- [ ] **Step 4: Verify AndroidKeyStore and software-key behavior**

Run:

```powershell
.\gradlew.bat :app:testDebugUnitTest --tests "com.chengxu.autoservice.core.auth.EncryptedSessionStoreTest" :app:connectedDebugAndroidTest "-Pandroid.testInstrumentationRunnerArguments.class=com.chengxu.autoservice.core.auth.AndroidKeystoreSessionCipherTest"
```

Expected: `BUILD SUCCESSFUL`; the JVM round-trip/fresh-IV tests and the real AndroidKeyStore test pass.

- [ ] **Step 5: Record, commit, and push Task 1**

Update `docs/latest-handoff-prompt.md` with the RED failure, provider-IV change, and GREEN commands. Then run:

```powershell
git -c safe.directory=E:/codex/chengxu add android-client/app/src/main/java/com/chengxu/autoservice/core/auth/SessionCipher.kt android-client/app/src/androidTest/java/com/chengxu/autoservice/core/auth/AndroidKeystoreSessionCipherTest.kt docs/latest-handoff-prompt.md
git -c safe.directory=E:/codex/chengxu commit -m "fix(android): use provider generated session IV"
git -c safe.directory=E:/codex/chengxu -c http.sslBackend=openssl push origin codex/android-mobile-ui-atlas
```

---

### Task 2: Non-crashing session persistence failure

**Files:**
- Modify: `android-client/app/src/test/java/com/chengxu/autoservice/core/auth/AuthenticationRepositoryTest.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/core/auth/AuthenticationRepository.kt`
- Modify: `docs/latest-handoff-prompt.md`

**Interfaces:**
- Consumes: `SessionStore.write(session: AppSession)` and `AuthenticationState`.
- Produces: exact user message `无法安全保存登录状态，请重试`; `Authenticated` is published only after persistence succeeds.

- [ ] **Step 1: Write the failing repository test**

Add to `AuthenticationRepositoryTest`:

```kotlin
@Test
fun storageFailureAfterRemoteLoginReturnsUnauthenticatedWithoutPublishingSession() = runTest {
    val repository = AuthenticationRepository(
        authApi = FakeAuthApi(AuthResult.Success(remoteSession())),
        sessionStore = object : SessionStore {
            override suspend fun read(): AppSession? = null
            override suspend fun write(session: AppSession) = throw IllegalStateException("storage failed")
            override suspend fun clear() = Unit
        },
    )

    repository.login(AuthCredentials("tongda", "worker", "secret12"))

    assertNull(repository.session.value)
    assertEquals(
        AuthenticationState.Unauthenticated("无法安全保存登录状态，请重试"),
        repository.state.value,
    )
}
```

- [ ] **Step 2: Run it and verify the exception escapes**

Run:

```powershell
.\gradlew.bat :app:testDebugUnitTest --tests "com.chengxu.autoservice.core.auth.AuthenticationRepositoryTest.storageFailureAfterRemoteLoginReturnsUnauthenticatedWithoutPublishingSession"
```

Expected: FAIL because `IllegalStateException("storage failed")` escapes from `AuthenticationRepository.login`.

- [ ] **Step 3: Add the minimal persistence boundary**

Replace the successful result branch in `AuthenticationRepository.login` with:

```kotlin
is AuthResult.Success -> {
    val authenticated = result.session.toAppSession()
    try {
        sessionStore.write(authenticated)
        publishAuthenticated(authenticated)
    } catch (_: Exception) {
        mutableSession.value = null
        mutableState.value = AuthenticationState.Unauthenticated(SESSION_STORAGE_ERROR_MESSAGE)
    }
}
```

Add inside `AuthenticationRepository`:

```kotlin
private companion object {
    const val SESSION_STORAGE_ERROR_MESSAGE = "无法安全保存登录状态，请重试"
}
```

- [ ] **Step 4: Verify the repository regression suite**

Run:

```powershell
.\gradlew.bat :app:testDebugUnitTest --tests "com.chengxu.autoservice.core.auth.AuthenticationRepositoryTest"
```

Expected: `BUILD SUCCESSFUL`; successful login still publishes only after writing, and failed persistence stays unauthenticated.

- [ ] **Step 5: Record, commit, and push Task 2**

Update `docs/latest-handoff-prompt.md`, then run:

```powershell
git -c safe.directory=E:/codex/chengxu add android-client/app/src/main/java/com/chengxu/autoservice/core/auth/AuthenticationRepository.kt android-client/app/src/test/java/com/chengxu/autoservice/core/auth/AuthenticationRepositoryTest.kt docs/latest-handoff-prompt.md
git -c safe.directory=E:/codex/chengxu commit -m "fix(android): contain session persistence failures"
git -c safe.directory=E:/codex/chengxu -c http.sslBackend=openssl push origin codex/android-mobile-ui-atlas
```

---

### Task 3: Full verification, manual QA, and APK delivery

**Files:**
- Modify: `docs/android-client.md`
- Modify: `docs/latest-handoff-prompt.md`
- Replace: `dist/releases/android/autoservice-android-debug-0.1.0.apk`

**Interfaces:**
- Consumes: fixed debug APK and production authentication endpoint.
- Produces: installable API 26+ debug APK plus verification evidence and updated SHA-256.

- [ ] **Step 1: Run the complete automated verification**

Run from `android-client`:

```powershell
.\gradlew.bat clean :app:testDebugUnitTest :app:compileDebugAndroidTestKotlin :app:lintDebug :app:assembleDebug
.\gradlew.bat :app:connectedDebugAndroidTest
```

Expected: both commands report `BUILD SUCCESSFUL`; all JVM and connected Android tests pass, and Lint has no blocking finding.

- [ ] **Step 2: Install the new build and clear the crash baseline**

```powershell
$adb='E:\codex\APP\.android-build\android-sdk\platform-tools\adb.exe'
& $adb -s emulator-5554 install -r E:\codex\chengxu\android-client\app\build\outputs\apk\debug\app-debug.apk
& $adb -s emulator-5554 shell am force-stop com.chengxu.autoservice
& $adb -s emulator-5554 shell am start -n com.chengxu.autoservice/.MainActivity
& $adb -s emulator-5554 logcat -c
```

Expected: install succeeds and the login screen opens.

- [ ] **Step 3: Complete manual authentication QA**

Have the user verify: valid login reaches the five-tab shell without process death; force-stop/relaunch restores the session; “我的 → 退出登录” returns to login and a later relaunch remains logged out. Capture `logcat -b crash -d` after the flow; expected output contains no `com.chengxu.autoservice` crash.

- [ ] **Step 4: Copy and fingerprint the APK**

```powershell
Copy-Item -LiteralPath E:\codex\chengxu\android-client\app\build\outputs\apk\debug\app-debug.apk -Destination E:\codex\chengxu\dist\releases\android\autoservice-android-debug-0.1.0.apk -Force
Get-Item E:\codex\chengxu\dist\releases\android\autoservice-android-debug-0.1.0.apk | Select-Object FullName,Length
Get-FileHash -Algorithm SHA256 E:\codex\chengxu\dist\releases\android\autoservice-android-debug-0.1.0.apk
```

- [ ] **Step 5: Document, commit, and push the verified release**

Update `docs/android-client.md` and `docs/latest-handoff-prompt.md` with test counts, emulator QA, APK size/hash, final commit, and next product task. Run `git diff --check`, then:

```powershell
git -c safe.directory=E:/codex/chengxu add docs/android-client.md docs/latest-handoff-prompt.md dist/releases/android/autoservice-android-debug-0.1.0.apk
git -c safe.directory=E:/codex/chengxu commit -m "docs: verify Android login crash fix"
git -c safe.directory=E:/codex/chengxu -c http.sslBackend=openssl push origin codex/android-mobile-ui-atlas
```

Expected: local HEAD equals `origin/codex/android-mobile-ui-atlas` and `git status --short` is empty.

