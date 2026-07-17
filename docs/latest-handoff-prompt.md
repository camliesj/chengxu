# 最新接力提示词

继续开发仓库 `https://github.com/camliesj/chengxu.git`。

## 当前 Git 状态

- 项目目录：`E:\codex\chengxu`
- 当前分支：`codex/android-mobile-ui-atlas`
- Android 生产客户端计划基线：`e629577`
- 当前交接文档基线提交：`9e6c704`
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
- 最终独立复核曾发现横幅原始色值、标签派生 alpha 色及公开 `Color` 参数会绕过色板契约；现已改为批准 token 和受限语义色调，并有 JVM 回归测试。Task 4 已完成。

### APF Task 5：Navigation 3 五栏壳层

- 已实现 `AppRoute`、`RootTab`、`AppNavigationState`、`AppNavDisplay`、`AutoserviceShell` 和阶段占位页。
- 五个根标签顺序固定为“工作台 / 工单 / 新增 / 档案 / 我的”；每个标签有独立返回栈，重复选择当前标签只重置自身。
- 离线时显示统一只读横幅并禁用第三项“新增”；除工作台外的根页面显示“该模块将在后续阶段接入”，没有伪造业务写入功能。

### APF Task 6：工作台状态与 ViewModel

- 已实现稳定的工作台模型、仓库接口、两条确定性中文演示工单和 `WorkbenchViewModel`。
- ViewModel 组合会话、网络和工作台数据流；动作只从 `PermissionSnapshot` 放行，并通过 `MutationGate` 携带离线只读拒绝原因。
- 员工状态不包含“办理结算”；管理员显示经营摘要并拥有该动作。Task 6 已通过独立代码复核。

### APF Task 7：员工/管理员工作台 UI

- 已实现基于 `WorkbenchUiState` 的员工与管理员工作台 Compose UI，并在 `AppNavDisplay` 预留注入点供应用装配使用。
- 员工显示问候、今日待办、工单状态和近期工单，且不显示结算；管理员先显示经营摘要，再显示结算与保险优先事项及近期工单。
- 拒绝的写入动作显示 `MutationDecision.Denied.reason`；UI 不自行按角色或权限推断可见性。布局未使用固定宽度或横向滚动，覆盖长中文公司名场景。Task 7 已通过独立代码复核。

### APF Task 8：应用装配与真机测试包

- `MainActivity` 已装配真实 `AndroidConnectivityNetworkMonitor`、内存会话、演示工单仓库和五栏壳层；网络回调会同时检查 INTERNET 与 VALIDATED，未验证网络保持离线只读。
- Debug 构建仅接受 Intent `demo_role=admin` 切换管理员演示会话；Release 构建始终回退员工，界面不包含角色切换控件。
- 已构建并复制可安装真机测试包：`dist/releases/android/autoservice-android-debug-0.1.0.apk`。Task 8 已通过独立代码复核，未启动模拟器。

### APF Task 9：文档与最终验证

- 已创建 `docs/android-client.md`，包含环境、构建、测试、安装、调试角色、断网验证、发布前检查和换机接力说明。
- 已更新 README，明确 Android 为独立 Kotlin/Compose 客户端，并链接真机测试文档。
- 最终验证不启动模拟器：Android JVM 测试、Android 测试代码编译和 Debug APK 构建均成功；网页 64/64 测试及生产构建均成功。

## 最新验证

2026-07-17 本机执行：

```powershell
$env:JAVA_HOME='E:\codex\APP\.android-build\jdk\jdk-17.0.19+10'
$env:ANDROID_HOME='E:\codex\APP\.android-build\android-sdk'
cd E:\codex\chengxu\android-client
.\gradlew.bat clean :app:testDebugUnitTest :app:compileDebugAndroidTestKotlin :app:assembleDebug
```

结果：`BUILD SUCCESSFUL`，57 个 Gradle task 执行成功；当前共 20 个 JVM 测试通过，Android 测试代码编译通过，Debug APK 构建通过。网页端 `npm.cmd test` 为 64/64 通过，`npm.cmd run build` 成功。

当前 APK：`E:\codex\chengxu\dist\releases\android\autoservice-android-debug-0.1.0.apk`，17.7 MB，可安装到 API 26+ 真机测试。SHA-256：`5D42617E4F6922BB306B764B25F3BD802F1F5979F42793E477A12AA941B09448`。构建来源仍保留在 `android-client\app\build\outputs\apk\debug\app-debug.apk`。

## 下一步

1. 在真实 Android 设备上安装当前 Debug APK，按 `docs/android-client.md` 验证员工、管理员和离线只读流程。
2. 下一开发里程碑：接入真实登录/会话 API；之后再替换演示仓库为 API 与本地缓存实现。

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
