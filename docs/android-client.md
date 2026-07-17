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
.\gradlew.bat clean :app:testDebugUnitTest :app:compileDebugAndroidTestKotlin :app:lintDebug :app:assembleDebug
```

`testDebugUnitTest` 运行 JVM 认证、加密会话、状态、权限、导航和网络门禁契约；`compileDebugAndroidTestKotlin` 仅验证 Compose/Activity 测试代码可编译，不会启动设备或模拟器。`lintDebug` 执行 Android 静态检查。

登录与 AndroidKeyStore 相关改动还应在已连接设备上执行：

```powershell
.\gradlew.bat :app:connectedDebugAndroidTest
```

2026-07-17 最新验证结果：41 个 JVM 测试和 10 个连接式 Android 测试全部通过，0 失败、0 错误、0 跳过；`lintDebug` 与 Debug APK 构建通过。真实 AndroidKeyStore 测试会验证 provider 自动生成 AES-GCM IV，防止登录成功后保存会话时发生 `Caller-provided IV not permitted` 崩溃。

## 安装调试 APK

将 `dist\releases\android\autoservice-android-debug-0.1.0.apk` 复制到真机并允许安装未知来源应用，然后打开“汽修接待”。也可在已连接 USB 调试的真机上执行：

```powershell
adb install -r E:\codex\chengxu\dist\releases\android\autoservice-android-debug-0.1.0.apk
```

初次打开显示登录页。认证成功后确认底部固定为“工作台 / 工单 / 新增 / 档案 / 我的”，第三项是“新增”。

当前交付 APK 为 18,777,848 字节，SHA-256：`1FFF7347B6E0A6EC2306C16AC5DE581B71938B20B8885F7AE87F6E489E837420`。

## 真实登录与会话真机检查

当前客户端调用 `https://chengxu.pages.dev/api/access`，只接受“公司 + 账号 + 密码”。公司下拉固定为“通达汽车服务中心”和“鑫齐恒汽车服务中心”；密码和 Token 不写入日志，密码不持久化。

请在真机依次验证：

1. 选择通达，使用有效账号密码登录；确认进入工作台，“我的”显示服务端返回的姓名、公司和角色。
2. 退出登录，再选择鑫齐恒并使用有效账号密码登录；确认没有短暂显示上一账号的姓名、公司或权限界面。
3. 输入错误密码；确认停留在登录页并显示“账号、密码或公司不正确”，不会进入五栏壳层。
4. 成功登录后强制停止并重新打开应用；在登录后 12 小时内应从加密本地会话直接恢复，不要求重新输入密码。
5. 在“我的”点击“退出登录”；确认回到登录页。再次强制停止并打开后仍应停留在登录页。
6. 保留登录超过服务端 12 小时有效期，或在后续已认证接口返回 `SESSION_EXPIRED` 时，确认本地会话被清除并提示“登录已过期，请重新登录”。当前演示工单仓库尚未发出已认证业务请求，因此自然过期的端到端触发应在真实工单 API 接入后再次验证。

## 断网验证

1. 退出登录，在真机关闭 Wi-Fi 与移动数据，填写账号密码并点击登录；确认不发送登录请求并显示“网络不可用，请检查网络连接后重试”。
2. 已登录时关闭网络，等待页面顶部出现“网络不可用，当前为只读模式”。
3. 确认底部第三项“新增”不可点击。
4. 恢复网络，确认横幅会在网络通过系统验证后消失；未验证的热点仍必须保持只读。

离线时所有写入动作由 `MutationGate` 拒绝，拒绝提示使用同一只读文案。

## 正式发布前检查

- 重新确认正式 `applicationId`、版本号、签名密钥和发布渠道；当前 APK 使用 Debug 签名，仅供真机测试，不是生产发布包。
- 检查源码中不存在访问码、腾讯云 COS 密钥、账号密码或其他密钥。
- 确认 Release 构建固定使用生产 HTTPS API 地址；Debug 的 `-PapiOrigin` 仅用于显式本地联调，不能写入提交。
- 本阶段已接入真实登录和加密会话恢复；工单数据仍是演示仓库，尚未接入真实工单 API、COS 或 Room 缓存。

## 换电脑接力

1. 拉取分支 `codex/android-mobile-ui-atlas`，先阅读 `docs/latest-handoff-prompt.md`。
2. 配置 JDK 17 与 Android SDK Platform 36，并设置 `JAVA_HOME`、`ANDROID_HOME`。
3. 在 `android-client\` 运行“运行测试”中的 Gradle 命令。
4. 新功能遵循测试先行、任务级复核、小步提交；重要改动后提交、推送并更新交接文档。
