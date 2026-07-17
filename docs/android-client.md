# Android 客户端交付与真机测试

## 环境要求

- JDK 17。
- Android SDK Platform 36；构建目标为 `compileSdk 36`、`targetSdk 35`、`minSdk 26`。
- 一台 API 26 及以上的 Android 真机用于安装测试；本阶段不要求启动模拟器。
- 在仓库根目录 `E:\codex\chengxu` 执行 Git 命令，在 `android-client\` 执行 Gradle 命令。

## 首次构建

```powershell
$env:JAVA_HOME='E:\codex\APP\.android-build\jdk\jdk-17.0.19+10'
$env:ANDROID_HOME='E:\codex\APP\.android-build\android-sdk'
cd E:\codex\chengxu\android-client
.\gradlew.bat :app:assembleDebug
```

构建输出为 `app\build\outputs\apk\debug\app-debug.apk`。当前交付副本为 `E:\codex\chengxu\dist\releases\android\autoservice-android-debug-0.1.0.apk`。

## 运行测试

```powershell
$env:JAVA_HOME='E:\codex\APP\.android-build\jdk\jdk-17.0.19+10'
$env:ANDROID_HOME='E:\codex\APP\.android-build\android-sdk'
cd E:\codex\chengxu\android-client
.\gradlew.bat :app:testDebugUnitTest :app:compileDebugAndroidTestKotlin :app:assembleDebug
```

`testDebugUnitTest` 运行 JVM 状态、权限、导航和网络门禁契约；`compileDebugAndroidTestKotlin` 仅验证 Compose/Activity 测试代码可编译，不会启动设备或模拟器。

## 安装调试 APK

将 `dist\releases\android\autoservice-android-debug-0.1.0.apk` 复制到真机并允许安装未知来源应用，然后打开“汽修接待”。也可在已连接 USB 调试的真机上执行：

```powershell
adb install -r E:\codex\chengxu\dist\releases\android\autoservice-android-debug-0.1.0.apk
```

初次打开默认显示员工工作台。确认底部固定为“工作台 / 工单 / 新增 / 档案 / 我的”，第三项是“新增”。

## 调试角色预览

仅 Debug APK 支持通过 Intent 预览管理员；应用界面不提供角色切换控件。

```powershell
adb shell am force-stop com.chengxu.autoservice
adb shell am start -n com.chengxu.autoservice/.MainActivity --es demo_role admin
```

管理员应显示“管理员工作台”“经营摘要”和“办理结算”。无参数或 `demo_role=employee` 时显示员工“今日工作”，不显示“办理结算”。Release 构建忽略 `demo_role` 并固定为员工。

## 断网验证

1. 在真机关闭 Wi-Fi 与移动数据。
2. 等待页面顶部出现“网络不可用，当前为只读模式”。
3. 确认底部第三项“新增”不可点击。
4. 恢复网络，确认横幅会在网络通过系统验证后消失；未验证的热点仍必须保持只读。

离线时所有写入动作由 `MutationGate` 拒绝，拒绝提示使用同一只读文案。

## 正式发布前检查

- 重新确认正式 `applicationId`、版本号、签名密钥和发布渠道；当前 APK 是未签名发布用途的 Debug 测试包。
- 检查源码中不存在访问码、腾讯云 COS 密钥、账号密码或其他密钥。
- 确认 Release 构建没有可见角色切换，且 `demo_role` 只受 `BuildConfig.DEBUG` 守卫。
- 本阶段不包含真实 API、COS、Room、本地持久化、真实登录或真实工单写入。

## 换电脑接力

1. 拉取分支 `codex/android-mobile-ui-atlas`，先阅读 `docs/latest-handoff-prompt.md`。
2. 配置 JDK 17 与 Android SDK Platform 36，并设置 `JAVA_HOME`、`ANDROID_HOME`。
3. 在 `android-client\` 运行“运行测试”中的 Gradle 命令。
4. 新功能遵循测试先行、任务级复核、小步提交；重要改动后提交、推送并更新交接文档。
