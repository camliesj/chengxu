# 最新接力提示词

继续开发仓库 `https://github.com/camliesj/chengxu.git`。

## 当前 Git 状态

- 项目目录：`E:\codex\chengxu`
- 当前分支：`codex/android-mobile-ui-atlas`
- Android 生产客户端计划基线：`e629577`
- 当前本地最新代码提交：`f90a0ee`
- 本次接力文档提交后应先执行 `git pull`，并以远程该分支最新提交为准。
- Windows 如需代理推送：

```powershell
$env:HTTPS_PROXY='http://127.0.0.1:7897'
$env:HTTP_PROXY='http://127.0.0.1:7897'
git -c safe.directory=E:/codex/chengxu push origin codex/android-mobile-ui-atlas
```

## 产品与权限基线

- 汽修接待与车辆保险管理系统，已有网页端和 Windows PC 客户端；当前开始独立 Android 客户端。
- 两家公司：通达汽车服务中心、鑫齐恒汽车服务中心；管理员拥有两家公司全部权限。
- 员工可以创建、编辑工单并将状态推进到“待结算”，但不能结算、返结算、作废、维护到账回执或导出。
- 已结算工单进入历史档案，未结算工单保留在当前工单。
- 断网时只允许查看缓存数据，显示“网络不可用，当前为只读模式”，并禁用所有写操作。
- Android 主导航方案 A：`工作台 / 工单 / 新增 / 档案 / 我的`，中间“新增”为第三项。

## 设计与实施文档

- 生产基础设计：`docs/superpowers/specs/2026-07-16-android-production-foundation-design.md`
- 九阶段实施计划：`docs/superpowers/plans/2026-07-16-android-production-foundation.md`
- 移动 UI 图集：`design/mobile-ui/`
- UI 图集说明：`docs/mobile-ui-atlas.md`
- 子任务记录：`.superpowers/sdd/android-production-foundation/`
- 进度台账：`.superpowers/sdd/progress.md`

## 已完成 Android 内容

### APF Task 1：可构建工程骨架

- 提交：`0c6c107`
- 独立 `android-client/` 工程，Gradle 8.13、AGP 8.13.2、Kotlin 2.3.21、JDK 17。
- `compileSdk 36`、`targetSdk 35`、`minSdk 26`，Compose + Navigation 3 依赖已配置。

### APF Task 2：权限与写入门禁

- 提交：`77845bd`
- 已实现 `UserRole`、`AppPermission`、`PermissionSnapshot`、`ConnectionState`、`MutationGate`。
- 离线拒绝优先于角色权限，门禁必须显式接收权限快照，不允许默认管理员放行。

### APF Task 3：会话与真实网络状态

- 提交：`6976c20`
- 已实现 `AppSession`、`SessionRepository`、`InMemorySessionRepository`、`NetworkMonitor`、`AndroidConnectivityNetworkMonitor`。
- 网络状态使用默认网络回调实时更新，并在 Flow 关闭时注销。

### APF Task 4：浅色科技设计系统

- 实现提交：`88dc2e8`
- 修复提交：`f39ae9c`、`b293a34`、`f90a0ee`
- 已实现完整 Material 3 浅色主题、10 个批准色板 token、4/8/12/16/24dp 间距、统一 8dp 圆角、零字距中文系统字体。
- 已实现 `AutoserviceTheme`、`AutoserviceCard`、`MetricCard`、带文字和图标的 `StatusChip`、带图标和精确文案的 `OfflineBanner`。
- 所有 48 个 Material 3 颜色槽位只映射到批准色板；测试锁定了十六进制/ARGB 值和全部颜色角色。
- 历次审查问题均已修复。最后一位复审代理在给出结论前变为 unavailable；新对话先对 `7ab4cef..f90a0ee` 做一次最终代码复核，若无问题即可将 Task 4 标记 complete，不要重复实现。

## 最新验证

2026-07-16 本机执行：

```powershell
$env:JAVA_HOME='E:\codex\APP\.android-build\jdk\jdk-17.0.19+10'
$env:ANDROID_HOME='E:\codex\APP\.android-build\android-sdk'
cd E:\codex\chengxu\android-client
.\gradlew.bat :app:testDebugUnitTest --rerun-tasks :app:compileDebugAndroidTestKotlin :app:assembleDebug
```

结果：`BUILD SUCCESSFUL`，56 个 Gradle task 执行成功；当前共 11 个 JVM 测试通过，Android 测试代码编译通过，Debug APK 构建通过。

当前 APK：`E:\codex\chengxu\android-client\app\build\outputs\apk\debug\app-debug.apk`，约 18.5 MB。这只是基础阶段测试包，最终工作台和导航完成后再复制到正式发布目录交付。

## 下一步

1. 对 Task 4 最终复核，确认 `7ab4cef..f90a0ee` 无剩余问题。
2. 执行 APF Task 5：Navigation 3 五栏壳层。
   - 使用 `.superpowers/sdd/android-production-foundation/task-5-brief.md`。
   - 每个根标签保留独立返回栈。
   - 重复点击当前标签只重置该标签栈。
   - 离线时禁用第三项“新增”，并显示统一只读提示。
   - 其余页面暂时显示“该模块将在后续阶段接入”，不伪装业务功能。
3. 依次执行 Task 6 工作台状态、Task 7 员工/管理员工作台 UI、Task 8 应用装配、Task 9 文档与最终验证。

## 用户最新决定

- 不需要在 Android 模拟器中安装或运行测试。
- 保留 JVM 单元测试、Android 测试代码编译、Lint/构建检查。
- 功能完成后生成可安装 APK，放到项目发布目录并给出文件路径，由用户在真实手机上测试。
- 因此 Task 8 中的模拟器 QA 改为“构建可安装测试 APK + 提供真机测试清单”，不要启动模拟器。

## 工作纪律

每次重要改动后必须：

1. 提交 Git；
2. 推送 GitHub；
3. 更新本文件 `docs/latest-handoff-prompt.md`。

不要提交腾讯云 COS 密钥、账号密码或其他敏感信息。不要修改现有网页端布局来模拟移动端；Android 保持独立 `android-client/` 工程。继续采用测试驱动、任务级审查和小步提交。
