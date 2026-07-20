# Android Compose Brand UI Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Faithfully migrate the approved 390×844 brand HTML prototype into the production Jetpack Compose client without changing authentication, permission, offline, Navigation 3, or workbench business rules.

**Architecture:** Keep repositories and ViewModels as the source of truth, and replace only the Compose rendering layer through a shared brand design system. Migrate vertically in five reviewable tasks: design system/assets, authentication, shell/profile/stages, workbenches, and final APK verification.

**Tech Stack:** Kotlin 2.3.21, Jetpack Compose BOM 2026.06.00, Material 3, Navigation 3.1.1.4, Android VectorDrawable, Hugeicons Core Free 4.2.2, JUnit 4, Compose UI Test, Gradle/AGP 8.13.2.

## Global Constraints

- Visual truth is `design/mobile-ui/?prototype=brand`, its `brand-prototype-*.png` captures, and `design/mobile-ui/src/tokens.css` at the approved 390×844 state.
- Brand colors are exactly `#F4F6F8`, `#FFFFFF`, `#F0F3F7`, `#EAF1FB`, `#101214`, `#697079`, `#E3E7EC`, `#111315`, `#25805F`, `#A96816`, and `#B84A45`.
- Primary panel radius is 20dp, card radius is 16dp, page horizontal padding is 16dp, and every touch target is at least 48×48dp.
- Use only official Hugeicons Core Free 4.2.2 data converted to local VectorDrawable resources; do not add Material Icons, handcrafted SVGs, emoji, text glyph icons, or runtime icon API calls.
- Reuse `login-service-vehicle.png` and `empty-service-tools.png` with their existing alpha channels and aspect ratios.
- Preserve `AuthenticationRepository`, `LoginViewModel`, `WorkbenchViewModel`, `MutationGate`, `AppNavigationState`, and Navigation 3 behavior.
- Do not add the HTML employee/administrator debug switch to Android; role comes only from the authenticated `AppSession`.
- Do not implement order writes, settlement, Room caching, or production order API work in this plan.
- Do not start an Android emulator. Keep JVM tests, Android test source compilation, Lint, and Debug APK assembly.
- After every task, update `docs/latest-handoff-prompt.md`, commit, and push `codex/android-mobile-ui-atlas`.

## File Structure

### Design system and assets

- Modify `android-client/app/src/main/java/com/chengxu/autoservice/core/designsystem/AutoserviceTokens.kt`: canonical brand colors, spacing, radii, motion durations.
- Modify `android-client/app/src/main/java/com/chengxu/autoservice/core/designsystem/AutoserviceTheme.kt`: Material 3 color-slot mapping and brand typography/shapes.
- Modify `android-client/app/src/main/java/com/chengxu/autoservice/core/designsystem/AutoserviceComponents.kt`: upgraded existing card, metric, and status public APIs.
- Create `android-client/app/src/main/java/com/chengxu/autoservice/core/designsystem/BrandControls.kt`: button, field, company selection, and interactive-state primitives.
- Create `android-client/app/src/main/java/com/chengxu/autoservice/core/designsystem/BrandIcon.kt`: the only Compose icon rendering boundary.
- Create `android-client/app/src/main/java/com/chengxu/autoservice/core/designsystem/BrandOverlay.kt`: confirmation dialog.
- Create `scripts/export-hugeicons-to-vector.mjs`: reproducible official Hugeicons-to-VectorDrawable conversion.
- Create `scripts/export-hugeicons-to-vector.test.mjs`: converter contract test.
- Generate `android-client/app/src/main/res/drawable/brand_icon_*.xml`: 24 official Hugeicons vectors.
- Copy `android-client/app/src/main/res/drawable-nodpi/brand_login_service_vehicle.png` and `brand_empty_service_tools.png`.
- Create `android-client/THIRD_PARTY_NOTICES.md`: Hugeicons package/version/license/source record.

### Screens and shell

- Modify `android-client/app/src/main/java/com/chengxu/autoservice/AutoserviceApp.kt`: brand restore screen and authenticated UI event wiring.
- Modify `android-client/app/src/main/java/com/chengxu/autoservice/ui/auth/LoginScreen.kt`: brand login composition.
- Modify `android-client/app/src/main/java/com/chengxu/autoservice/ui/shell/AutoserviceShell.kt`: branded fixed five-tab bar and honest quick-action routing.
- Modify `android-client/app/src/main/java/com/chengxu/autoservice/ui/shell/OfflineBanner.kt`: branded offline banner.
- Modify `android-client/app/src/main/java/com/chengxu/autoservice/navigation/AppNavDisplay.kt`: branded stage/profile destinations.
- Modify `android-client/app/src/main/java/com/chengxu/autoservice/ui/stage/StageScreen.kt`: typed stage empty states.
- Modify `android-client/app/src/main/java/com/chengxu/autoservice/ui/profile/ProfileScreen.kt`: identity details and guarded logout.
- Modify `android-client/app/src/main/java/com/chengxu/autoservice/ui/workbench/WorkbenchModels.kt`: role-neutral status-band UI data.
- Modify `android-client/app/src/main/java/com/chengxu/autoservice/ui/workbench/WorkbenchViewModel.kt`: populate status-band values without changing repositories or permissions.
- Modify `android-client/app/src/main/java/com/chengxu/autoservice/ui/workbench/WorkbenchScreen.kt`: shared employee/admin brand composition.
- Modify `android-client/app/src/main/java/com/chengxu/autoservice/ui/workbench/WorkbenchComponents.kt`: brand hero, band, metric, action, and order components.

### Tests and delivery

- Modify `android-client/app/src/test/java/com/chengxu/autoservice/core/designsystem/AutoserviceThemeTest.kt`.
- Modify `android-client/app/src/androidTest/java/com/chengxu/autoservice/DesignSystemTest.kt`.
- Modify `android-client/app/src/androidTest/java/com/chengxu/autoservice/AutoserviceAppTest.kt`.
- Modify `android-client/app/src/androidTest/java/com/chengxu/autoservice/AutoserviceShellTest.kt`.
- Modify `android-client/app/src/androidTest/java/com/chengxu/autoservice/WorkbenchScreenTest.kt`.
- Modify `docs/android-client.md`, `docs/latest-handoff-prompt.md`, and `dist/releases/android/autoservice-android-debug-0.1.0.apk`.

---

### Task 1: Brand tokens, shared components, Hugeicons, and raster assets

**Files:**
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/core/designsystem/AutoserviceTokens.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/core/designsystem/AutoserviceTheme.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/core/designsystem/AutoserviceComponents.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/designsystem/BrandControls.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/designsystem/BrandIcon.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/designsystem/BrandOverlay.kt`
- Create: `scripts/export-hugeicons-to-vector.mjs`
- Create: `scripts/export-hugeicons-to-vector.test.mjs`
- Create: `android-client/app/src/main/res/drawable/brand_icon_*.xml`
- Create: `android-client/app/src/main/res/drawable-nodpi/brand_login_service_vehicle.png`
- Create: `android-client/app/src/main/res/drawable-nodpi/brand_empty_service_tools.png`
- Create: `android-client/THIRD_PARTY_NOTICES.md`
- Modify: `android-client/app/src/test/java/com/chengxu/autoservice/core/designsystem/AutoserviceThemeTest.kt`
- Modify: `android-client/app/src/androidTest/java/com/chengxu/autoservice/DesignSystemTest.kt`
- Modify: `docs/latest-handoff-prompt.md`

**Interfaces:**
- Produces: `AutoserviceColors`, `AutoserviceSpacing`, `AutoserviceRadii`, `AutoserviceMotion`, `AutoserviceShapes`, and `AutoserviceTheme(content)`.
- Produces: `BrandButton(tone, icon, loading, enabled, onClick, content)`, `BrandTextField(...)`, `CompanySelectionCard(...)`, `AutoserviceCard`, `MetricCard`, and `StatusChip`.
- Produces: `BrandIconResource` plus `BrandIcon(resource, contentDescription, modifier, tint)`.
- Produces: `BrandConfirmDialog(title, description, cancelLabel, confirmLabel, returnFocusRequester, onCancel, onConfirm)`.

- [x] **Step 1: Replace the theme contract tests with the approved brand contract**

Update `AutoserviceThemeTest.kt` so the canonical-value test contains these exact assertions and the Material color-role allowlist uses the same eleven colors:

```kotlin
@Test
fun canonicalColorsMatchTheApprovedBrandArgbValues() {
    assertEquals(0xFFF4F6F8.toInt(), AutoserviceColors.Canvas.toArgb())
    assertEquals(0xFFFFFFFF.toInt(), AutoserviceColors.Surface.toArgb())
    assertEquals(0xFFF0F3F7.toInt(), AutoserviceColors.SurfaceSoft.toArgb())
    assertEquals(0xFFEAF1FB.toInt(), AutoserviceColors.Ice.toArgb())
    assertEquals(0xFF101214.toInt(), AutoserviceColors.Ink.toArgb())
    assertEquals(0xFF697079.toInt(), AutoserviceColors.InkMuted.toArgb())
    assertEquals(0xFFE3E7EC.toInt(), AutoserviceColors.Line.toArgb())
    assertEquals(0xFF111315.toInt(), AutoserviceColors.Action.toArgb())
    assertEquals(0xFF25805F.toInt(), AutoserviceColors.Success.toArgb())
    assertEquals(0xFFA96816.toInt(), AutoserviceColors.Warning.toArgb())
    assertEquals(0xFFB84A45.toInt(), AutoserviceColors.Danger.toArgb())
}

@Test
fun brandRadiiMatchTheApprovedPrototype() {
    assertEquals(20.dp, AutoserviceRadii.Panel)
    assertEquals(16.dp, AutoserviceRadii.Card)
    assertEquals(16.dp, AutoserviceRadii.Control)
}
```

Add a `DesignSystemTest` case that renders `BrandButton(enabled = false)` and asserts the node is disabled and at least 48dp high.

- [x] **Step 2: Add the failing vector-export contract**

Create `scripts/export-hugeicons-to-vector.test.mjs`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { ICON_SPECS, renderVectorDrawable } from './export-hugeicons-to-vector.mjs';

test('exports the approved Hugeicons set as tintable 24dp vectors', () => {
  assert.equal(ICON_SPECS.length, 24);
  for (const spec of ICON_SPECS) {
    const xml = renderVectorDrawable(spec.nodes);
    assert.match(xml, /android:width="24dp"/);
    assert.match(xml, /android:viewportWidth="24"/);
    assert.match(xml, /android:strokeColor="#FF000000"/);
    assert.doesNotMatch(xml, /android:fillColor="#FF000000"/);
  }
});
```

- [x] **Step 3: Run the focused tests and verify RED**

Run:

```powershell
node --test scripts/export-hugeicons-to-vector.test.mjs
cd android-client
.\gradlew.bat :app:testDebugUnitTest --tests com.chengxu.autoservice.core.designsystem.AutoserviceThemeTest
```

Expected: Node fails because the exporter does not exist; Gradle fails because `Canvas`, `AutoserviceRadii`, and the new brand values do not exist.

- [x] **Step 4: Implement the canonical tokens and Material mapping**

Replace the token boundary with these names and values, then update every Material color role to use only them:

```kotlin
object AutoserviceColors {
    val Canvas = Color(0xFFF4F6F8)
    val Surface = Color(0xFFFFFFFF)
    val SurfaceSoft = Color(0xFFF0F3F7)
    val Ice = Color(0xFFEAF1FB)
    val Ink = Color(0xFF101214)
    val InkMuted = Color(0xFF697079)
    val Line = Color(0xFFE3E7EC)
    val Action = Color(0xFF111315)
    val ActionOn = Surface
    val Success = Color(0xFF25805F)
    val Warning = Color(0xFFA96816)
    val Danger = Color(0xFFB84A45)
}

object AutoserviceRadii {
    val Panel = 20.dp
    val Card = 16.dp
    val Control = 16.dp
}

object AutoserviceMotion {
    const val FastMillis = 120
    const val BaseMillis = 180
}
```

Set `AutoserviceShapes.extraSmall/small/medium` to 16dp and `large/extraLarge` to 20dp. Keep zero letter spacing and define explicit headline, title, body, and label sizes rather than inheriting platform defaults.

- [x] **Step 5: Implement the shared component boundaries**

Create the public APIs below. Use `MutableInteractionSource.collectIsPressedAsState()`, `animateFloatAsState`, `minimumInteractiveComponentSize()`, and Material semantics; do not expose arbitrary color parameters.

```kotlin
enum class BrandButtonTone { PRIMARY, SECONDARY, QUIET, DANGER }

@Composable
fun BrandButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    tone: BrandButtonTone = BrandButtonTone.PRIMARY,
    icon: BrandIconResource? = null,
    loading: Boolean = false,
    enabled: Boolean = true,
    content: @Composable RowScope.() -> Unit,
)

@Composable
fun BrandTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    error: String? = null,
    leadingIcon: BrandIconResource? = null,
    trailingContent: (@Composable () -> Unit)? = null,
    enabled: Boolean = true,
    visualTransformation: VisualTransformation = VisualTransformation.None,
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default,
    keyboardActions: KeyboardActions = KeyboardActions.Default,
)

@Composable
fun CompanySelectionCard(
    companyName: String,
    selected: Boolean,
    enabled: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
)
```

Upgrade `AutoserviceCard`, `MetricCard`, and `StatusChip` to the 16dp brand card surface. Keep `MetricTone` and `StatusTone` as the only semantic color inputs.

- [x] **Step 6: Implement the reproducible Hugeicons exporter and render the resources**

`export-hugeicons-to-vector.mjs` must import the 24 names already used by `icon-map.js`, expose an `ICON_SPECS` array, convert official `path` nodes directly, convert the one `circle` node to two arc commands, escape XML, and write `brand_icon_<snake_case>.xml` files.

Core conversion:

```js
export function renderVectorDrawable(nodes) {
  const paths = nodes.map(([tag, attributes]) => {
    const pathData = tag === 'path'
      ? attributes.d
      : circleToPath(Number(attributes.cx), Number(attributes.cy), Number(attributes.r));
    return `    <path android:fillColor="@android:color/transparent" android:pathData="${escapeXml(pathData)}" android:strokeColor="#FF000000" android:strokeLineCap="${attributes.strokeLinecap ?? 'round'}" android:strokeLineJoin="${attributes.strokeLinejoin ?? 'round'}" android:strokeWidth="${attributes.strokeWidth ?? '1.5'}" />`;
  }).join('\n');
  return `<?xml version="1.0" encoding="utf-8"?>\n<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="24dp" android:height="24dp" android:viewportWidth="24" android:viewportHeight="24">\n${paths}\n</vector>\n`;
}
```

Keep importing the module side-effect free for the Node test. Write resources only from the CLI entry point:

```js
const isCli = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isCli) {
  await writeVectorDrawables(
    path.resolve('android-client/app/src/main/res/drawable'),
    ICON_SPECS,
  );
}
```

Run:

```powershell
node scripts/export-hugeicons-to-vector.mjs
New-Item -ItemType Directory -Force 'android-client\app\src\main\res\drawable-nodpi' | Out-Null
Copy-Item 'design\mobile-ui\public\brand-assets\login-service-vehicle.png' 'android-client\app\src\main\res\drawable-nodpi\brand_login_service_vehicle.png'
Copy-Item 'design\mobile-ui\public\brand-assets\empty-service-tools.png' 'android-client\app\src\main\res\drawable-nodpi\brand_empty_service_tools.png'
```

Create `BrandIconResource` with all 24 `R.drawable.brand_icon_*` IDs and render them only through `painterResource` in `BrandIcon`. Record `@hugeicons/core-free-icons` 4.2.2 and MIT license in `android-client/THIRD_PARTY_NOTICES.md`.

- [x] **Step 7: Run GREEN verification**

Run:

```powershell
node --test scripts/export-hugeicons-to-vector.test.mjs
cd android-client
.\gradlew.bat :app:testDebugUnitTest --tests com.chengxu.autoservice.core.designsystem.AutoserviceThemeTest :app:compileDebugAndroidTestKotlin :app:lintDebug
```

Expected: Node test passes; theme JVM tests pass; Android test sources and Lint complete with `BUILD SUCCESSFUL`.

- [x] **Step 8: Update handoff, commit, and push**

Record token values, component APIs, exact vector count, PNG dimensions/alpha preservation, license notice, and verification results. Commit:

```powershell
git add android-client scripts docs/latest-handoff-prompt.md
git commit -m "feat(android): add compose brand design system"
git push origin codex/android-mobile-ui-atlas
```

---

### Task 2: Brand restore and login experience

**Files:**
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/AutoserviceApp.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/ui/auth/LoginScreen.kt`
- Modify: `android-client/app/src/androidTest/java/com/chengxu/autoservice/AutoserviceAppTest.kt`
- Modify: `docs/latest-handoff-prompt.md`

**Interfaces:**
- Consumes: `BrandButton`, `BrandTextField`, `CompanySelectionCard`, `BrandIconResource`, and `R.drawable.brand_login_service_vehicle` from Task 1.
- Preserves: `LoginScreen(state, onCompanySelected, onUsernameChanged, onPasswordChanged, onLogin, modifier)`.
- Produces: private `BrandRestoringScreen()` used only for `AuthenticationState.Restoring`.

- [x] **Step 1: Write failing Compose tests for the new login contract**

Extend `AutoserviceAppTest` with tests that assert both companies are visible without opening a dropdown, selected semantics move to 鑫齐恒 after click, password visibility changes from “显示密码” to “隐藏密码”, and submitting/error behavior remains owned by the existing ViewModel.

```kotlin
@Test
fun loginShowsTwoSelectableCompanyCardsAndPasswordVisibility() {
    setApp(storedSession = null)

    composeRule.onNodeWithText("通达汽车服务中心").assertIsDisplayed()
    composeRule.onNodeWithText("鑫齐恒汽车服务中心").assertIsDisplayed().performClick()
    composeRule.onNodeWithTag("company-xinqiheng").assertIsSelected()
    composeRule.onNodeWithContentDescription("显示密码").performClick()
    composeRule.onNodeWithContentDescription("隐藏密码").assertIsDisplayed()
}
```

Add a test that wraps the app in `Modifier.requiredWidth(360.dp)` through a test-only `LoginScreen` render and asserts the root width is 360dp and the login button is displayed after scrolling.

- [x] **Step 2: Run the tests and verify RED**

Run:

```powershell
cd android-client
.\gradlew.bat :app:compileDebugAndroidTestKotlin
```

Expected: compilation fails because the new company tags/selected contract and password actions do not exist.

- [x] **Step 3: Implement the brand restoring screen**

Replace the bare progress box with a Canvas-colored full-screen composition containing the Ice brand mark surface, `CircularProgressIndicator(color = AutoserviceColors.Action)`, and “正在安全恢复登录状态”. Do not read or render session identity while state is `Restoring`.

- [x] **Step 4: Replace the dropdown login with the approved composition**

Build `LoginScreen` as a vertically scrollable, IME-padded column with:

1. an Ice hero panel containing “汽修服务工作台”, supporting copy, and `brand_login_service_vehicle` using `ContentScale.Fit`;
2. a 20dp white panel containing two `CompanySelectionCard` controls;
3. account and password `BrandTextField` controls;
4. a 48dp near-black `BrandButton`.

Use local saveable password visibility only:

```kotlin
var passwordVisible by rememberSaveable { mutableStateOf(false) }

BrandTextField(
    value = state.password,
    onValueChange = onPasswordChanged,
    label = "密码",
    leadingIcon = BrandIconResource.Lock,
    visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done, keyboardType = KeyboardType.Password),
    keyboardActions = KeyboardActions(onDone = { onLogin() }),
    trailingContent = {
        IconButton(onClick = { passwordVisible = !passwordVisible }, enabled = !state.submitting) {
            BrandIcon(
                resource = if (passwordVisible) BrandIconResource.EyeOff else BrandIconResource.Eye,
                contentDescription = if (passwordVisible) "隐藏密码" else "显示密码",
            )
        }
    },
)
```

Keep the exact ViewModel callbacks and error text. Do not call the repository from the Composable.

- [x] **Step 5: Run focused and regression verification**

Run:

```powershell
cd android-client
.\gradlew.bat :app:testDebugUnitTest --tests com.chengxu.autoservice.ui.auth.LoginViewModelTest :app:compileDebugAndroidTestKotlin :app:lintDebug
```

Expected: LoginViewModel tests pass unchanged; Android tests compile; Lint and the combined build are successful.

- [x] **Step 6: Update handoff, commit, and push**

Record the new hero, company cards, IME behavior, visibility toggle, preserved login states, test results, and that no emulator was launched. Commit:

```powershell
git add android-client/app/src docs/latest-handoff-prompt.md
git commit -m "feat(android): upgrade brand login experience"
git push origin codex/android-mobile-ui-atlas
```

---

### Task 3: Five-tab shell, offline state, stage pages, profile, and logout dialog

**Files:**
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/ui/shell/AutoserviceShell.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/ui/shell/OfflineBanner.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/navigation/AppNavDisplay.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/ui/stage/StageScreen.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/ui/profile/ProfileScreen.kt`
- Modify: `android-client/app/src/androidTest/java/com/chengxu/autoservice/AutoserviceShellTest.kt`
- Modify: `android-client/app/src/androidTest/java/com/chengxu/autoservice/AutoserviceAppTest.kt`
- Modify: `docs/latest-handoff-prompt.md`

**Interfaces:**
- Consumes: Task 1 brand tokens, icons, `BrandButton`, `BrandConfirmDialog`, and `brand_empty_service_tools`.
- Produces: `enum class StageKind(val title, val phase, val description, val actionLabel)`.
- Preserves: five independent `AppNavigationState` stacks and exact offline copy.
- Routes allowed workbench actions by `AppPermission`: create → `RootTab.CREATE`; advance/settle → `RootTab.ORDERS`.

- [ ] **Step 1: Write failing shell and guarded-logout tests**

Extend `AutoserviceShellTest`:

```kotlin
@Test
fun allFiveBrandTabsNavigateAndCreateRemainsThird() {
    launchShell(connection = ConnectionState.Online)

    composeRule.onAllNodesWithTag("root-tab").assertCountEquals(5)
    composeRule.onNodeWithText("工单").performClick()
    composeRule.onNodeWithText("工单列表正在升级").assertIsDisplayed()
    composeRule.onNodeWithText("新增").performClick()
    composeRule.onNodeWithText("新增工单即将接入").assertIsDisplayed()
    composeRule.onNodeWithText("档案").performClick()
    composeRule.onNodeWithText("客户档案正在整理").assertIsDisplayed()
}
```

Change the authenticated app test so clicking “退出登录” first shows “确认退出登录”; clicking “暂不退出” returns to profile; confirming the second dialog returns to login.

- [ ] **Step 2: Run Android test compilation and verify RED**

Run:

```powershell
cd android-client
.\gradlew.bat :app:compileDebugAndroidTestKotlin
```

Expected: compilation succeeds but the new tests would fail when executed because stage copy and the confirmation dialog are absent; if tags or enum references are introduced in the test, compilation fails until the next steps add them.

- [ ] **Step 3: Implement the branded bottom navigation and offline banner**

Replace Material icon imports with `BrandIconResource`. Keep `NavigationBarItem` semantics for ordinary tabs, and render the central item with a 48dp Action-colored circular icon container. Selected ordinary tabs use Ice container, Ink icon/text, and semibold label; unselected tabs use InkMuted.

Keep `enabled = tab != RootTab.CREATE || !isOffline`. Upgrade `OfflineBanner` to use `BrandIconResource.Offline`, Ice/SurfaceSoft styling, and the exact text “网络不可用，当前为只读模式”.

- [ ] **Step 4: Implement typed stage destinations**

Define:

```kotlin
enum class StageKind(
    val title: String,
    val phase: String,
    val description: String,
    val actionLabel: String,
) {
    ORDERS("工单列表正在升级", "视觉壳层 · 待接真实数据", "下一阶段将接入本地缓存与在线刷新；当前版本先提供稳定导航与只读状态。", "查看接入说明"),
    CREATE("新增工单即将接入", "阶段功能 · 暂未开放", "真实业务表单将在后续阶段实现，当前页面不会伪造写入结果。", "查看字段规划"),
    RECORDS("客户档案正在整理", "视觉壳层 · 待接真实数据", "后续将统一客户、车辆、保险与历史结算记录。", "查看档案范围"),
}
```

Render the brand empty-state PNG with `ContentScale.Fit`, a `StatusChip`, title/description, and a secondary `BrandButton`. The button displays an honest Snackbar containing the description; it does not simulate a write.

- [ ] **Step 5: Implement profile identity and guarded logout**

Profile shows staff name, company, role, “刚刚同步”, and “登录状态已加密保存在本机”. Keep local `showLogoutDialog` state. The first logout click opens `BrandConfirmDialog`; only the confirm callback invokes the existing `onLogout`.

```kotlin
if (showLogoutDialog) {
    BrandConfirmDialog(
        title = "确认退出登录",
        description = "退出后将清除本机加密登录状态，并返回登录页面。",
        cancelLabel = "暂不退出",
        confirmLabel = "退出登录",
        returnFocusRequester = logoutFocusRequester,
        onCancel = { showLogoutDialog = false },
        onConfirm = { showLogoutDialog = false; onLogout() },
    )
}
```

Attach `logoutFocusRequester` to the profile logout button. `BrandConfirmDialog` uses `Dialog`, a 20dp Surface panel, its own `FocusRequester` on the cancel button, system back dismissal through `onDismissRequest`, and calls `returnFocusRequester.requestFocus()` after cancel/back dismissal.

- [ ] **Step 6: Route allowed workbench actions without fake writes**

Inside `AutoserviceShell`, wrap the callback sent to `AppNavDisplay`:

```kotlin
val routeWorkbenchAction: (WorkbenchAction) -> Unit = { action ->
    when (action.permission) {
        AppPermission.CREATE_ORDER -> navigationState.select(RootTab.CREATE)
        AppPermission.ADVANCE_ORDER_STATUS,
        AppPermission.SETTLE_ORDER -> navigationState.select(RootTab.ORDERS)
        else -> onWorkbenchAction(action)
    }
}
```

Denied actions remain inside `WorkbenchScreen` and show their exact `MutationDecision.Denied.reason`; only allowed actions reach this routing callback.

- [ ] **Step 7: Run focused and regression verification**

Run:

```powershell
cd android-client
.\gradlew.bat :app:testDebugUnitTest --tests com.chengxu.autoservice.navigation.AppNavigationStateTest :app:compileDebugAndroidTestKotlin :app:lintDebug
```

Expected: navigation JVM tests pass unchanged; Android tests compile; Lint succeeds; no emulator is launched.

- [ ] **Step 8: Update handoff, commit, and push**

Record navigation styling, exact stage boundaries, offline behavior, dialog focus/back behavior, action routing, and verification results. Commit:

```powershell
git add android-client/app/src docs/latest-handoff-prompt.md
git commit -m "feat(android): upgrade brand navigation shell"
git push origin codex/android-mobile-ui-atlas
```

---

### Task 4: Employee and administrator brand workbenches

**Files:**
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/ui/workbench/WorkbenchModels.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/ui/workbench/WorkbenchViewModel.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/ui/workbench/WorkbenchScreen.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/ui/workbench/WorkbenchComponents.kt`
- Modify: `android-client/app/src/androidTest/java/com/chengxu/autoservice/WorkbenchScreenTest.kt`
- Modify: `android-client/app/src/androidTest/java/com/chengxu/autoservice/AutoserviceShellTest.kt`
- Modify: `docs/latest-handoff-prompt.md`

**Interfaces:**
- Adds: `val statusMetrics: List<WorkbenchMetric>` to `WorkbenchUiState`.
- Preserves: `WorkbenchScreen(state, onAction, modifier)` and permission-derived `quickActions`.
- Produces: shared internal `WorkbenchHero`, `WorkbenchStatusBand`, `WorkbenchMetricGrid`, `WorkbenchQuickActions`, and `WorkbenchOrderCard` Composables.

- [ ] **Step 1: Write failing workbench visual-contract tests**

Extend `WorkbenchScreenTest` to require the four-item status band, brand sections, full-card action semantics, role content, and 360dp safety:

```kotlin
@Test
fun employeeBrandWorkbenchShowsStatusBandMetricsActionsAndOrders() {
    setWorkbench(employeeState())

    listOf("新建", "在修", "待结算", "保险到期").forEach {
        composeRule.onNodeWithText(it).assertIsDisplayed()
    }
    composeRule.onNodeWithText("今日概览").assertIsDisplayed()
    composeRule.onNodeWithText("快捷操作").assertIsDisplayed()
    composeRule.onNodeWithText("我的待办").assertIsDisplayed()
    composeRule.onAllNodesWithText("办理结算").assertCountEquals(0)
}
```

Add an `AutoserviceShellTest` case that supplies an allowed `新增工单` action, clicks it, and asserts “新增工单即将接入”. Keep the existing denied-reason test unchanged.

- [ ] **Step 2: Run Android test compilation and verify RED**

Run:

```powershell
cd android-client
.\gradlew.bat :app:compileDebugAndroidTestKotlin
```

Expected: compilation fails after tests reference `statusMetrics`, or execution would fail because status-band and new section labels are absent.

- [ ] **Step 3: Add role-neutral status-band data**

Add `statusMetrics` to `WorkbenchUiState` with an empty default. Populate it in `toWorkbenchUiState` with:

```kotlin
private val workbenchStatusMetrics = listOf(
    WorkbenchMetric("新建", "06", "待接单", MetricTone.PRIMARY),
    WorkbenchMetric("在修", "18", "维修看板", MetricTone.SUCCESS),
    WorkbenchMetric("待结算", "05", "费用核对", MetricTone.WARNING),
    WorkbenchMetric("保险到期", "09", "联系车主", MetricTone.DANGER),
)
```

Do not change repository interfaces, authenticated role mapping, action permissions, or recent-order data.

- [ ] **Step 4: Build the shared brand workbench composition**

Replace role-specific layout branching with one composition driven by the existing state:

```kotlin
@Composable
fun WorkbenchScreen(
    state: WorkbenchUiState,
    onAction: (WorkbenchAction) -> Unit,
    modifier: Modifier = Modifier,
) {
    val metrics = if (state.businessMetrics.isNotEmpty()) state.businessMetrics else state.metrics
    val isAdministrator = state.businessMetrics.isNotEmpty()
    // Brand hero → four-column status band → metric grid → quick actions → recent orders.
}
```

The hero uses Ice background, greeting, company, and a success/offline `StatusChip`. The status band is four equal `weight(1f)` cells with compact typography at 360dp, never a horizontal scroller. Metric cards remain a two-column grid. Quick actions use icons mapped by permission and 48dp secondary buttons. Recent orders use a full-width clickable `AutoserviceCard` with arrow icon, plate/customer, repair summary, status, order number, and amount.

- [ ] **Step 5: Preserve permission and rejection behavior**

For each quick action, keep the existing decision gate:

```kotlin
when (val decision = action.decision) {
    MutationDecision.Allowed -> onAction(action)
    is MutationDecision.Denied -> coroutineScope.launch {
        snackbarHostState.showSnackbar(decision.reason)
    }
}
```

Map icons only from permission: create → Add, advance → Tools, settle → Wallet. Do not infer action visibility from role inside the UI.

- [ ] **Step 6: Run focused and full Android verification**

Run:

```powershell
cd android-client
.\gradlew.bat :app:testDebugUnitTest --tests com.chengxu.autoservice.ui.workbench.WorkbenchViewModelTest :app:compileDebugAndroidTestKotlin :app:lintDebug :app:assembleDebug
```

Expected: ViewModel JVM tests pass; Android tests compile; Lint and Debug APK build succeed; no simulator starts.

- [ ] **Step 7: Update handoff, commit, and push**

Record employee/admin parity, exact metric values, status band, action routing, 360dp contract, permission invariants, and verification results. Commit:

```powershell
git add android-client/app/src docs/latest-handoff-prompt.md
git commit -m "feat(android): upgrade role workbenches"
git push origin codex/android-mobile-ui-atlas
```

---

### Task 5: Full verification, installable APK, and real-device handoff

**Files:**
- Modify: `android-client/app/src/androidTest/java/com/chengxu/autoservice/DesignSystemTest.kt`
- Modify: `android-client/app/src/androidTest/java/com/chengxu/autoservice/AutoserviceAppTest.kt`
- Modify: `android-client/app/src/androidTest/java/com/chengxu/autoservice/AutoserviceShellTest.kt`
- Modify: `android-client/app/src/androidTest/java/com/chengxu/autoservice/WorkbenchScreenTest.kt`
- Modify: `docs/android-client.md`
- Modify: `docs/latest-handoff-prompt.md`
- Update: `dist/releases/android/autoservice-android-debug-0.1.0.apk`

**Interfaces:**
- Verifies: restore → login → role-derived workbench → five tabs → profile → cancel logout → confirm logout.
- Produces: installable API 26+ Debug APK, SHA-256, and an exact real-device test checklist.

- [ ] **Step 1: Complete the Android UI source contracts**

Ensure Android test sources contain these assertions:

- every visible interactive component has a minimum 48dp touch target;
- two company cards expose selected semantics;
- password visibility action has changing content description;
- five root tabs remain ordered and central create is disabled offline;
- employee content omits settlement and administrator content includes it;
- denied actions display the exact gate reason;
- logout first opens a dialog, cancel retains the authenticated profile, and confirm returns to login;
- a 360dp workbench shows the long company name without horizontal overflow.

Use existing fixtures and fake repositories; do not add network calls or screenshot goldens that require an emulator.

- [ ] **Step 2: Run the clean final Android build**

Run from a fresh Gradle invocation:

```powershell
$env:JAVA_HOME='E:\codex\APP\.android-build\jdk\jdk-17.0.19+10'
$env:ANDROID_HOME='E:\codex\APP\.android-build\android-sdk'
cd E:\codex\chengxu\android-client
.\gradlew.bat clean :app:testDebugUnitTest :app:compileDebugAndroidTestKotlin :app:lintDebug :app:assembleDebug
```

Expected: `BUILD SUCCESSFUL`; all JVM tests pass; Android tests compile; Lint reports no blocking issue; `app/build/outputs/apk/debug/app-debug.apk` exists.

- [ ] **Step 3: Copy and hash the installable APK**

Run:

```powershell
Copy-Item 'E:\codex\chengxu\android-client\app\build\outputs\apk\debug\app-debug.apk' 'E:\codex\chengxu\dist\releases\android\autoservice-android-debug-0.1.0.apk' -Force
Get-Item 'E:\codex\chengxu\dist\releases\android\autoservice-android-debug-0.1.0.apk' | Select-Object FullName,Length
Get-FileHash 'E:\codex\chengxu\dist\releases\android\autoservice-android-debug-0.1.0.apk' -Algorithm SHA256
```

Expected: destination exists, length is greater than zero, and a 64-character SHA-256 is printed.

- [ ] **Step 4: Update real-device verification documentation**

In `docs/android-client.md`, add a “品牌 UI 真机验收” checklist with:

1. both companies selectable and visibly selected;
2. account/password, visibility toggle, IME and validation;
3. employee/admin workbench content from real accounts;
4. all five tabs, fixed bottom navigation, and central add styling;
5. airplane-mode banner, read-only browsing, and disabled writes;
6. profile identity, cancel logout, confirm logout, and login return;
7. 360dp-class device text/controls, system bars, and no horizontal clipping.

Record the final command result, JVM test count, APK size/hash, and “未启动 Android 模拟器” in `docs/latest-handoff-prompt.md`.

- [ ] **Step 5: Inspect the final diff and repository state**

Run:

```powershell
git diff --check
git status --short
git diff --stat
```

Expected: no whitespace errors; only the intended Android source, tests, docs, generated vectors/assets, and release APK are changed.

- [ ] **Step 6: Commit, push, and confirm remote parity**

Run:

```powershell
git add android-client docs dist/releases/android/autoservice-android-debug-0.1.0.apk
git commit -m "build(android): deliver compose brand ui apk"
git push origin codex/android-mobile-ui-atlas
git rev-parse HEAD
git rev-parse origin/codex/android-mobile-ui-atlas
```

Expected: push succeeds; local and remote hashes are identical; worktree is clean.

## Plan Self-Review

- Spec coverage: visual truth, exact tokens, radii, shared components, official Hugeicons conversion/license, existing raster assets, restore/login, five-tab shell, stage pages, profile/logout, offline behavior, dual-role workbench, permission preservation, 360dp safety, no emulator, final tests, APK, docs, commit, and push each have an owning task.
- Scope isolation: this plan changes only the Android presentation layer and its UI-state additions; real order API, Room, writes, settlement, and server contracts remain outside the plan.
- Type consistency: `BrandIconResource`, `BrandButtonTone`, `BrandButton`, `BrandTextField`, `CompanySelectionCard`, `BrandConfirmDialog`, `StageKind`, and `WorkbenchUiState.statusMetrics` are introduced before later consumers use them.
- Placeholder scan: every task names exact files, interfaces, test cases, commands, expected results, copy, and commit boundaries.
