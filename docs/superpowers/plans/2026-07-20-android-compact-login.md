# Android Compact Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the oversized Android login composition with an accessible compact layout whose full primary action is visible at 360×800dp and whose Hero collapses when the IME opens.

**Architecture:** Keep authentication state and callbacks unchanged. Add a small pure layout policy that maps IME visibility to stable Compose dimensions, consume it from `LoginScreen`, and add an opt-in compact mode to the shared company card so other screens retain their existing size. Lock the policy with executable JVM tests and lock the visible-screen contract with Compose instrumentation source that is compiled but not run without a device.

**Tech Stack:** Kotlin 2.3.0, Jetpack Compose Material 3, Compose WindowInsets, JUnit 4, AndroidX Compose UI Test, Gradle 8.10.2, Android API 26+.

## Global Constraints

- At 360×800dp with the IME hidden and default font scale, the full “进入系统” button must be visible without a scroll action.
- At 390×844dp, the security note should also be visible while the existing vehicle asset remains recognizable.
- Company cards, text fields, password visibility control, and primary button must retain at least 48dp touch height.
- The normal Hero is 200dp; the IME-visible Hero is 96dp and hides the vehicle.
- The form overlaps the Hero by 16dp and keeps vertical scrolling only as an accessibility fallback.
- Reuse the existing brand colors, shapes, `brand_login_service_vehicle` asset, and local Hugeicons resources.
- Do not change company IDs, authentication callbacks, API behavior, session storage, Room data, or the web application.
- Do not start an Android emulator or claim connected Android tests ran; compile their source and build the APK.
- Use TDD for each behavior change, update `docs/latest-handoff-prompt.md`, commit, and push after important changes.

---

### Task 1: Make the adaptive layout policy executable and testable

**Files:**
- Create: `android-client/app/src/test/java/com/chengxu/autoservice/ui/auth/LoginLayoutPolicyTest.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/ui/auth/LoginLayoutPolicy.kt`

**Interfaces:**
- Consumes: a Boolean `imeVisible` obtained later from Compose `WindowInsets.ime`.
- Produces: `internal fun loginLayoutSpec(imeVisible: Boolean): LoginLayoutSpec` with `heroHeight`, `panelOverlap`, `showVehicle`, and `showMarketingTitle` fields.

- [x] **Step 1: Write the failing JVM test**

```kotlin
package com.chengxu.autoservice.ui.auth

import androidx.compose.ui.unit.dp
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class LoginLayoutPolicyTest {
    @Test
    fun regularLayoutKeepsTheVehicleInA200DpHero() {
        val spec = loginLayoutSpec(imeVisible = false)

        assertEquals(200.dp, spec.heroHeight)
        assertEquals(16.dp, spec.panelOverlap)
        assertTrue(spec.showVehicle)
        assertTrue(spec.showMarketingTitle)
    }

    @Test
    fun imeLayoutUsesA96DpContextOnlyHero() {
        val spec = loginLayoutSpec(imeVisible = true)

        assertEquals(96.dp, spec.heroHeight)
        assertEquals(16.dp, spec.panelOverlap)
        assertFalse(spec.showVehicle)
        assertFalse(spec.showMarketingTitle)
    }
}
```

- [x] **Step 2: Run the focused test and verify RED**

Run from `android-client/`:

```powershell
.\gradlew.bat :app:testDebugUnitTest --tests "*LoginLayoutPolicyTest"
```

Expected: compilation fails because `loginLayoutSpec` and `LoginLayoutSpec` do not exist.

- [x] **Step 3: Add the minimal production policy**

```kotlin
package com.chengxu.autoservice.ui.auth

import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

internal data class LoginLayoutSpec(
    val heroHeight: Dp,
    val panelOverlap: Dp,
    val showVehicle: Boolean,
    val showMarketingTitle: Boolean,
)

internal fun loginLayoutSpec(imeVisible: Boolean): LoginLayoutSpec =
    if (imeVisible) {
        LoginLayoutSpec(
            heroHeight = 96.dp,
            panelOverlap = 16.dp,
            showVehicle = false,
            showMarketingTitle = false,
        )
    } else {
        LoginLayoutSpec(
            heroHeight = 200.dp,
            panelOverlap = 16.dp,
            showVehicle = true,
            showMarketingTitle = true,
        )
    }
```

- [x] **Step 4: Run the focused test and verify GREEN**

Run the same focused Gradle command. Expected: `LoginLayoutPolicyTest` reports 2 tests with 0 failures and Gradle exits successfully.

- [x] **Step 5: Commit and push the policy milestone**

```powershell
git add android-client/app/src/main/java/com/chengxu/autoservice/ui/auth/LoginLayoutPolicy.kt android-client/app/src/test/java/com/chengxu/autoservice/ui/auth/LoginLayoutPolicyTest.kt docs/latest-handoff-prompt.md
git commit -m "feat(android): add adaptive login layout policy"
git push origin codex/android-mobile-ui-atlas
```

---

### Task 2: Lock the 360×800 UI contract and implement the compact composition

**Files:**
- Modify: `android-client/app/src/androidTest/java/com/chengxu/autoservice/AutoserviceAppTest.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/core/designsystem/BrandControls.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/ui/auth/LoginScreen.kt`

**Interfaces:**
- Consumes: `loginLayoutSpec(imeVisible: Boolean)`, `WindowInsets.ime`, existing `LoginUiState`, and existing callbacks.
- Produces: `CompanySelectionCard(..., compact: Boolean = false)`, plus stable `LoginTestTags.HERO`, `FORM_PANEL`, `PRIMARY_ACTION`, and `SECURITY_NOTE` semantics.

- [x] **Step 1: Write the failing Compose contract**

Remove the `performScrollTo` import. Add `assertHeightIsEqualTo` and `requiredSize` imports. Replace the 360dp test body with:

```kotlin
@Test
fun loginShowsThePrimaryActionWithoutScrollingAt360By800Dp() {
    composeRule.setContent {
        AutoserviceTheme {
            LoginScreen(
                state = LoginUiState(),
                onCompanySelected = {},
                onUsernameChanged = {},
                onPasswordChanged = {},
                onLogin = {},
                modifier = Modifier.requiredSize(width = 360.dp, height = 800.dp),
            )
        }
    }

    composeRule.onNodeWithTag(LoginTestTags.ROOT)
        .assertWidthIsEqualTo(360.dp)
        .assertHeightIsEqualTo(800.dp)
    composeRule.onNodeWithTag(LoginTestTags.HERO).assertHeightIsEqualTo(200.dp)
    composeRule.onNodeWithTag(LoginTestTags.COMPANY_TONGDA).assertHeightIsEqualTo(56.dp)
    composeRule.onNodeWithTag(LoginTestTags.COMPANY_XINQIHENG).assertHeightIsEqualTo(56.dp)
    composeRule.onNodeWithTag(LoginTestTags.PRIMARY_ACTION)
        .assertIsDisplayed()
        .assertHeightIsAtLeast(48.dp)
}
```

- [x] **Step 2: Compile Android test source and verify RED**

Run:

```powershell
.\gradlew.bat :app:compileDebugAndroidTestKotlin
```

Expected: compilation fails because the new login test tags do not exist. This is the available RED gate without launching an emulator.

- [x] **Step 3: Add opt-in compact company cards**

Change the shared signature and sizing without changing the default:

```kotlin
fun CompanySelectionCard(
    companyName: String,
    selected: Boolean,
    enabled: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    supportingText: String? = null,
    compact: Boolean = false,
) {
    Surface(
        modifier = modifier
            .heightIn(min = if (compact) 56.dp else 72.dp)
            .alpha(if (enabled) 1f else 0.48f)
            .selectable(
                selected = selected,
                enabled = enabled,
                role = Role.RadioButton,
                onClick = onClick,
            ),
        shape = AutoserviceShape,
        color = if (selected) AutoserviceColors.Ice else AutoserviceColors.Surface,
        contentColor = AutoserviceColors.Ink,
        border = BorderStroke(1.dp, if (selected) AutoserviceColors.Action else AutoserviceColors.Line),
    ) {
        Row(
            modifier = if (compact) {
                Modifier.padding(horizontal = AutoserviceSpacing.Md, vertical = AutoserviceSpacing.Sm)
            } else {
                Modifier.padding(AutoserviceSpacing.Md)
            },
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(AutoserviceSpacing.Sm),
        ) {
            BrandIcon(
                resource = BrandIconResource.Building,
                contentDescription = null,
                tint = if (selected) AutoserviceColors.Action else AutoserviceColors.InkMuted,
            )
            Column(modifier = Modifier.weight(1f)) {
                Text(text = companyName, style = MaterialTheme.typography.labelLarge)
                supportingText?.let {
                    Text(
                        text = it,
                        style = MaterialTheme.typography.bodySmall,
                        color = AutoserviceColors.InkMuted,
                    )
                }
            }
            if (selected) {
                BrandIcon(
                    resource = BrandIconResource.Check,
                    contentDescription = "已选择",
                    tint = AutoserviceColors.Action,
                )
            }
        }
    }
}
```

Keep all existing selection semantics, borders, colors, icons, press behavior, and disabled alpha unchanged.

- [x] **Step 4: Consume IME state and rebuild the login composition**

In `LoginScreen.kt`:

```kotlin
val density = LocalDensity.current
val layoutSpec = loginLayoutSpec(
    imeVisible = WindowInsets.ime.getBottom(density) > 0,
)
```

Apply these exact changes:

- Keep the root `imePadding()`, `verticalScroll`, background, and root test tag.
- Call `LoginHero(layoutSpec)` and tag its root with `LoginTestTags.HERO`.
- Set the Hero height from `layoutSpec.heroHeight`.
- In regular mode, show the brand eyebrow, the two-line “让每一次服务\n更从容” using `headlineMedium`, and the existing vehicle in a 154dp slot; the source PNG contains large transparent top/bottom bounds, so this produces an approximately 60dp visible vehicle and leaves the subject above the 16dp panel overlap. Omit the old Hero subtitle.
- In IME mode, show the brand eyebrow and one line “登录维修业务移动端” using `titleMedium`; omit the marketing title and vehicle.
- Offset the form by `-layoutSpec.panelOverlap`, tag it `FORM_PANEL`, and use 16dp horizontal/vertical inner padding with 12dp item spacing.
- Remove “欢迎回来”; retain “登录维修业务移动端” and change the helper to “选择企业并使用业务账号登录”.
- Remove both legal-name supporting strings from `CompanyOption` and invoke both company cards with `supportingText = null` and `compact = true`.
- Remove the extra spacer elements around enterprise cards and fields.
- Tag `BrandButton` as `PRIMARY_ACTION`.
- Replace the vertical security-note column with a centered row tagged `SECURITY_NOTE`, containing the existing 18dp shield, an 8dp spacer, and the existing single-line security text.

- [x] **Step 5: Compile Android tests and run focused JVM regression**

Run:

```powershell
.\gradlew.bat :app:testDebugUnitTest --tests "*LoginLayoutPolicyTest" :app:compileDebugAndroidTestKotlin
```

Expected: Gradle exits successfully; the 2 layout policy tests pass and Android test Kotlin compiles. Do not claim the Compose test executed.

- [x] **Step 6: Review the exact UI requirements in source**

Run:

```powershell
rg -n "330\.dp|154\.dp|欢迎回来|鄂尔多斯市|performScrollTo|200\.dp|96\.dp|compact = true|WindowInsets\.ime" app/src/main app/src/androidTest app/src/test
```

Expected: no obsolete 330dp/154dp Hero sizes, welcome eyebrow, legal names, or `performScrollTo` remain in the login flow; the new dimensions, compact card use, and IME detection are present.

- [x] **Step 7: Update handoff, commit, and push the UI milestone**

Record RED/GREEN commands truthfully in `docs/latest-handoff-prompt.md`, then:

```powershell
git add android-client/app/src/main/java/com/chengxu/autoservice/core/designsystem/BrandControls.kt android-client/app/src/main/java/com/chengxu/autoservice/ui/auth/LoginScreen.kt android-client/app/src/androidTest/java/com/chengxu/autoservice/AutoserviceAppTest.kt docs/latest-handoff-prompt.md
git commit -m "feat(android): compact the adaptive login screen"
git push origin codex/android-mobile-ui-atlas
```

---

### Task 3: Run release verification and publish the installable APK

**Files:**
- Modify: `docs/android-client.md`
- Modify: `docs/latest-handoff-prompt.md`
- Replace: `dist/releases/android/autoservice-android-debug-0.1.0.apk`

**Interfaces:**
- Consumes: the completed compact login implementation and all existing Android tests.
- Produces: a signed API 26+ Debug APK plus an exact real-device login UI checklist and recorded verification evidence.

- [x] **Step 1: Run the full clean verification suite**

Run from `android-client/` with the configured JDK 17 and Android SDK:

```powershell
.\gradlew.bat clean :app:testDebugUnitTest :app:compileDebugAndroidTestKotlin :app:lintDebug :app:assembleDebug --rerun-tasks
```

Expected: `BUILD SUCCESSFUL`; all JVM tests pass; Android test Kotlin compiles; Lint contains zero Fatal and zero Error findings; Debug APK is created. Report actual warning and test counts from XML rather than assuming them.

- [x] **Step 2: Update the real-device checklist**

Add compact-login checks to `docs/android-client.md`:

- 360dp-width portrait: full login button visible without scrolling before the keyboard opens.
- Vehicle fully readable above the form and no longer mostly covered by the panel.
- Both short company names fit in their 56dp cards and remain selectable.
- Username/password focus collapses the Hero; current field and primary action stay reachable above the keyboard.
- Password visibility, loading disabled state, errors, both companies, and real login remain functional.
- Default and enlarged system font sizes do not clip controls; emergency scrolling remains available when content truly cannot fit.

- [x] **Step 3: Copy, hash, and verify the APK**

Copy `android-client/app/build/outputs/apk/debug/app-debug.apk` to `dist/releases/android/autoservice-android-debug-0.1.0.apk`, compare both SHA-256 hashes, and run the configured Android SDK `apksigner verify --verbose` command. Expected: source and release hashes match and v2 verification succeeds.

- [x] **Step 4: Review every design requirement against evidence**

Re-read `docs/superpowers/specs/2026-07-20-android-compact-login-design.md` and confirm each requirement is represented by source, an executable JVM assertion, compiled Compose test code, or an explicit real-device checklist item. Record the limitation that visual comparison and connected UI execution were not performed because no emulator was started.

- [x] **Step 5: Update handoff, commit, and push the release milestone**

Record exact Gradle task count, JVM test count, Lint counts, APK size/hash/signature, and the no-emulator limitation in `docs/latest-handoff-prompt.md`, then:

```powershell
git add android-client docs dist/releases/android/autoservice-android-debug-0.1.0.apk
git commit -m "build(android): release compact login APK"
git push origin codex/android-mobile-ui-atlas
```

- [x] **Step 6: Confirm repository state**

Run `git status --short --branch`, `git rev-parse HEAD`, and `git rev-parse origin/codex/android-mobile-ui-atlas`. Expected: the worktree is clean and both commit hashes are identical.
