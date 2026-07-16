# 最新接力提示词

继续开发 `https://github.com/camliesj/chengxu.git`。

当前工作分支：`codex/android-mobile-ui-atlas`  
UI 图集基线提交：`28ab718`（后续接力时先执行 `git pull`，以远程最新提交为准）

已完成 Android 移动端导航方案 A 的完整 UI 设计原型，尚未开始 Android 生产客户端编码。设计原型位于 `design/mobile-ui/`，交付说明位于 `docs/mobile-ui-atlas.md`。已生成 22 张 390×844 单屏 PNG 和 4 张总览图，覆盖登录、员工/管理员工作台、当前工单、筛选、员工/管理员详情、新增四步、编辑、状态确认、结算、回执、返结算、客户车辆档案、车辆保险、维修历史、我的、断网只读和系统状态。

已确认权限：员工可将工单推进到待结算，但不可结算、返结算、作废或维护到账回执；管理员拥有上述高权限操作。已结算工单进入维修历史，未结算工单保留在当前工单。离线时只允许查看缓存数据。

Android 生产客户端第一阶段设计规格已获用户批准，文件位于 `docs/superpowers/specs/2026-07-16-android-production-foundation-design.md`。逐文件实施计划位于 `docs/superpowers/plans/2026-07-16-android-production-foundation.md`，包含 9 个任务和 48 个测试驱动步骤，现已开始生产代码。已确认采用 Kotlin + Jetpack Compose、最低 Android 8.0（API 26）、单 Activity、Navigation 3、ViewModel + StateFlow、Repository 与单向数据流；第一阶段只实现独立 `android-client/` 工程、五栏壳层、设计系统、员工/管理员静态工作台、权限快照和断网只读门禁，不接 API、COS、Room、真实登录或工单写入。

Android 生产客户端 Task 1 已完成并通过任务级规格/质量审查，实现提交为 `0c6c107`。`android-client/` 已可独立运行 Gradle 8.13，使用 AGP 8.13.2、Kotlin 2.3.21、JDK 17、`compileSdk 36`、`targetSdk 35`、`minSdk 26`；`BuildSanityTest` 与 `assembleDebug` 均通过，Debug APK 位于 `android-client/app/build/outputs/apk/debug/app-debug.apk`。

Android Task 2 已完成并通过任务级审查，实现提交为 `77845bd`。已新增 `UserRole`、`AppPermission`、`PermissionSnapshot`、`ConnectionState` 和统一 `MutationGate`；员工不含结算、返结算、作废、回执权限，管理员包含全部权限；离线拒绝优先于角色权限，且门禁必须显式传入权限快照，不存在默认管理员放行。

Android Task 3 已完成并通过任务级审查，实现提交为 `6976c20`。已新增不可变 `AppSession`、`SessionRepository`、`InMemorySessionRepository`、`NetworkMonitor` 与 `AndroidConnectivityNetworkMonitor`；真实网络监听从当前网络能力初始化，通过默认网络回调实时更新，并在流关闭时反注册。Android JVM 测试现为 8 项全部通过，网络回调的模拟器级验证保留到 Task 8。下一项为浅色科技设计系统和断网提示组件。

最新验证结果：

- 移动 UI 目录测试：3/3 通过
- Playwright 移动 UI 与截图测试：79/79 通过
- 现有业务 Node 测试：64/64 通过
- `npm.cmd run build`：通过
- PNG 数量：22 张单屏 + 4 张总览

下一步：按 `docs/superpowers/plans/2026-07-16-android-production-foundation.md` 执行。推荐使用 subagent-driven-development，每个任务单独测试、审查、提交并推送；也可在当前任务中用 executing-plans 分批执行。不要修改网页端布局来模拟移动端，也不要在第一阶段接入真实 API/COS。

常用命令：

```powershell
npm.cmd run design:mobile
npm.cmd run test:mobile-ui
npm.cmd test
npm.cmd run build
```
