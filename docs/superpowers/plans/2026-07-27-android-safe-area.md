# Android 全局状态栏安全区 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 Android 所有应用路由从系统状态栏下方开始布局，并交付已签名校验的真实手机测试 APK。

**Architecture:** 在 `AutoserviceApp` 的 Compose 根容器统一消费 `statusBarsPadding()`，认证前后所有页面共享同一个顶部安全区。根容器在 padding 之前绘制 Canvas 背景；底部 `NavigationBar` 保持现有 Material inset 行为，绝不额外添加 bottom 或 system-bars padding。

**Tech Stack:** Kotlin、Jetpack Compose、Compose Material 3、JUnit 4、Android Gradle Plugin、Build Tools 35.0.0。

## Global Constraints

- 分支固定为 `codex/android-mobile-ui-atlas`；任务开始前执行 `git pull --ff-only` 并确认工作树仅包含本任务改动。
- 不启动 Android 模拟器，不运行 connected Android 测试。
- 顶部仅使用 `statusBarsPadding()`；不得使用 `systemBarsPadding()` 或 `navigationBarsPadding()`，以免改变底部五栏高度或制造双重安全区。
- 不修改数据库、网络接口、导航状态、生产 D1、Cloudflare Pages 或能力开关。
- 重要改动后更新 `docs/latest-handoff-prompt.md`，提交 Git 并推送 GitHub。
- 最终保留 JVM 测试、Android 测试源码编译、Lint、Debug APK 构建、签名验证和真实手机验收清单。

---

### Task 1: 根级状态栏安全区与测试 APK

**Files:**

- Create: `android-client/app/src/androidTest/java/com/chengxu/autoservice/AutoserviceSafeAreaTest.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/AutoserviceApp.kt`
- Modify: `docs/android-client.md`
- Modify: `docs/latest-handoff-prompt.md`
- Replace: `dist/releases/android/autoservice-android-debug-0.1.0.apk`

**Interfaces:**

- Consumes: 根 `AutoserviceApp`、`AutoserviceColors.Canvas` 和 Material `NavigationBar` 的现有布局。
- Produces: 所有认证前后路由统一位于状态栏下方；根 Canvas 延伸至状态栏安全区；底部五栏不额外增加 inset。

- [ ] **Step 1: 写入顶部安全区 RED Compose 测试**

创建 `AutoserviceSafeAreaTest.kt`：

```kotlin
package com.chengxu.autoservice

import androidx.compose.material3.Text
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class AutoserviceSafeAreaTest {
    @get:Rule val composeRule = createComposeRule()

    @Test
    fun rootSafeAreaLayoutDisplaysItsContent() {
        composeRule.setContent {
            AutoserviceRootLayout {
                Text("safe-area-content", modifier = androidx.compose.ui.Modifier.testTag("safe-area-content"))
            }
        }

        composeRule.onNodeWithTag("safe-area-content").assertIsDisplayed()
    }
}
```

- [ ] **Step 2: 运行 RED 测试并确认失败原因正确**

运行：

```powershell
cd android-client
$env:JAVA_HOME='E:\codex\APP\.android-build\jdk\jdk-17.0.19+10'
$env:ANDROID_HOME='E:\codex\APP\.android-build\android-sdk'
.\gradlew.bat :app:compileDebugAndroidTestKotlin
```

预期：失败于 `AutoserviceRootLayout` 尚不存在；不连接设备，因此不运行 Android 测试。

- [ ] **Step 3: 在根 Compose 容器添加最小安全区实现**

在 `AutoserviceApp.kt` 导入 `BoxScope` 和 `statusBarsPadding`，并新增下列可复用根容器：

```kotlin
@Composable
internal fun AutoserviceRootLayout(content: @Composable BoxScope.() -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(AutoserviceColors.Canvas)
            .statusBarsPadding(),
        content = content,
    )
}
```

随后把认证状态 `when` 包裹为：

```kotlin
AutoserviceTheme {
    AutoserviceRootLayout {
        when (val state = authenticationState) {
            // 保留现有 Restoring / Unauthenticated / Authenticated 分支，不改变参数或导航。
        }
    }
}
```

不要改变 `AutoserviceShell` 的 `NavigationBar`，不要为子页面添加单独状态栏 padding，也不要增加 bottom inset。

- [ ] **Step 4: 运行 GREEN 合同测试与完整无设备门禁**

运行：

```powershell
cd android-client
$env:JAVA_HOME='E:\codex\APP\.android-build\jdk\jdk-17.0.19+10'
$env:ANDROID_HOME='E:\codex\APP\.android-build\android-sdk'
.\gradlew.bat :app:testDebugUnitTest :app:compileDebugAndroidTestKotlin :app:lintDebug :app:assembleDebug --rerun-tasks
```

预期：测试、Android 测试源码编译、Lint 与 Debug APK 均 `BUILD SUCCESSFUL`；不得启动模拟器。

- [ ] **Step 5: 归档、校验并签名验证 APK**

运行：

```powershell
cd E:\codex\chengxu
$source='android-client\app\build\outputs\apk\debug\app-debug.apk'
$release='dist\releases\android\autoservice-android-debug-0.1.0.apk'
New-Item -ItemType Directory -Path (Split-Path -Parent $release) -Force | Out-Null
Copy-Item -LiteralPath $source -Destination $release -Force
Get-FileHash -LiteralPath $source,$release -Algorithm SHA256
$env:JAVA_HOME='E:\codex\APP\.android-build\jdk\jdk-17.0.19+10'
& 'E:\codex\APP\.android-build\android-sdk\build-tools\35.0.0\apksigner.bat' verify --verbose $release
```

预期：源包与交付包 SHA-256 一致，`Verified using v2 scheme (APK Signature Scheme v2): true`。

- [ ] **Step 6: 更新验收记录、提交并推送**

在 `docs/android-client.md` 的真实手机清单加入状态栏验收：详情、编辑、状态确认、登录和大字体/横屏下，状态栏不遮挡任何可点控件；底部五栏仍可点击。`docs/latest-handoff-prompt.md` 记录测试总数、APK path/size/hash、无模拟器状态与本次仅顶部 inset 的范围。

运行：

```powershell
cd E:\codex\chengxu
git add android-client/app/src/main/java/com/chengxu/autoservice/AutoserviceApp.kt android-client/app/src/androidTest/java/com/chengxu/autoservice/AutoserviceSafeAreaTest.kt docs/superpowers/plans/2026-07-27-android-safe-area.md docs/android-client.md docs/latest-handoff-prompt.md dist/releases/android/autoservice-android-debug-0.1.0.apk
git diff --cached --check
git commit -m "fix(android): respect status bar safe area"
git push origin codex/android-mobile-ui-atlas
```

预期：`HEAD` 等于 `origin/codex/android-mobile-ui-atlas`，工作树干净；真实手机人工验收仍是最终视觉与交互证据。
