# 最新接力提示词

继续开发仓库 `https://github.com/camliesj/chengxu.git`。

## 当前 Git 状态

- 项目目录：`E:\codex\chengxu`
- 当前分支：`codex/android-mobile-ui-atlas`
- Android 认证与会话集成基线：`99d5454`
- 隔离分支 `codex/android-auth-session` 已快进合并到当前分支；合并后的 JVM 测试、Android 测试代码编译、Lint 与 APK 构建均通过。
- 本次接力文档提交后应先执行 `git pull`，并以远程该分支最新提交为准。
- Windows 如需代理推送：

```powershell
$env:HTTPS_PROXY='http://127.0.0.1:7897'
$env:HTTP_PROXY='http://127.0.0.1:7897'
git -c safe.directory=E:/codex/chengxu -c http.sslBackend=openssl push origin codex/android-mobile-ui-atlas
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
- 已确认的认证与会话设计：`docs/superpowers/specs/2026-07-17-android-authentication-session-design.md`
- 认证与会话实施计划：`docs/superpowers/plans/2026-07-17-android-authentication-session.md`
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
.\gradlew.bat clean :app:testDebugUnitTest :app:compileDebugAndroidTestKotlin :app:lintDebug :app:assembleDebug
```

结果：强制重跑 `BUILD SUCCESSFUL`，65 个 Gradle task 全部执行成功；当前 41 个 JVM 测试全部通过（0 失败、0 错误、0 跳过），Android 测试代码编译、`lintDebug` 和 Debug APK 构建均通过。随后在 API 35 模拟器重新执行完整 `connectedDebugAndroidTest`，10/10 Android 测试通过（0 失败、0 错误、0 跳过）。认证改动未触碰网页端；网页端最近一次基线仍为 64/64 测试通过、生产构建成功。

当前 APK：`E:\codex\chengxu\dist\releases\android\autoservice-android-debug-0.1.0.apk`，18,777,848 字节（17.91 MiB），可安装到 API 26+ 真机测试。SHA-256：`1FFF7347B6E0A6EC2306C16AC5DE581B71938B20B8885F7AE87F6E489E837420`。

## 下一步

1. 在真实 Android 设备上安装当前 Debug APK，继续按 `docs/android-client.md` 验证双公司切换、错误密码、退出、过期重登和离线拒绝登录；模拟器真实账号登录已由用户确认不再闪退。
2. 继续下一产品阶段：将演示工单仓库替换为真实 API 与本地缓存实现，并保持离线只读和权限门禁契约。

### 认证与会话 Task 1：服务端会话契约（已完成）

- 已添加 `RemoteSession`、`AuthCredentials` 与服务端角色/权限到 Android 会话的映射；管理员拥有全部 Android 权限，员工只获得已知的服务端权限键，未知键不放行。
- `AppSession` 已具备公司 ID、账号和 Token 字段；Token 不写入日志，密码不属于会话模型。
- 已增加 `INTERNET` 权限、Kotlin JSON 序列化依赖和生产 HTTPS API 基址；仅 Debug 可通过未提交的 `-PapiOrigin` 覆盖地址。
- 已完成映射专属测试与 JVM 全量回归，并通过独立代码复核（无阻塞问题）；提交 `b032b6a` 已推送至隔离开发分支 `codex/android-auth-session`。

### 认证与会话 Task 2：认证仓库与加密存储（已完成）

- 已先行增加登录成功及会话过期清除的 JVM 测试，并实现可注入的 `AuthenticationRepository`、`AuthApi` 结果类型与 `SessionStore` 边界。
- `SessionRepository` 已改为可空会话流；工作台会过滤空会话，既有内存会话测试已适配。认证仓库专属测试已通过。
- 已实现 Android Keystore AES-256-GCM 非导出密钥、每次加密随机 12 字节 IV、私有 SharedPreferences 密文保存和 12 小时本地过期；损坏或过期密文会清除且不恢复。
- 已实现 `HttpURLConnection` 真实登录客户端：10 秒连接/读取超时、`POST /api/access` JSON、200 会话解析、401 无效账号、网络失败与其他服务端错误映射；不记录密码或 Token。
- 加密存储、异常密文、HTTP 成功/401/网络失败/异常 200/服务端错误均有 JVM 回归测试；认证专属测试、全量 JVM 测试与 Android 测试代码编译通过，独立安全复核无阻塞问题。

### 认证与会话 Task 3：登录根入口与退出登录（已完成）

- `AutoserviceApp` 现在按 `Restoring / Unauthenticated / Authenticated` 切换根界面：恢复中仅显示无敏感信息的进度指示，未登录显示登录页，已登录才创建五栏工作台。
- 登录页只提供通达、鑫齐恒两家公司下拉选择，包含账号、屏蔽密码、离线/校验/服务端错误、提交中状态与重复提交保护；成功后清空密码。
- “我的”页显示当前服务端会话身份并提供“退出登录”；退出清除加密本地会话并回到登录页。`MainActivity` 已移除 Debug 演示角色装配，改为真实 API、Android Keystore 加密会话存储和网络监控依赖。
- 每个认证会话使用独立 `ViewModelStoreOwner`；退出或换账号会立即清理旧 `WorkbenchViewModel`，避免上一账号姓名、公司或权限派生状态跨会话残留。
- 已覆盖空输入、离线、成功凭据映射、密码清空、会话错误同步、重复提交和服务器错误；Android 根切换、公司下拉和退出回登录测试代码可编译。全量 JVM 测试与 Android 测试代码编译通过，独立复核批准，无遗留问题；未启动模拟器。

### 认证与会话 Task 4：最终验证与真机 APK（已完成）

- 已增加显式退出清除持久化会话、清空公开会话并回到未认证状态的确定性 JVM 回归测试。
- 已执行干净的 JVM 测试、Android 测试代码编译、`lintDebug` 和 APK 构建：66 个 Gradle task 全部成功，39 个 JVM 测试全部通过，Lint 无阻塞问题。
- 已将新 Debug APK 复制到 `dist/releases/android/autoservice-android-debug-0.1.0.apk`，大小 17.91 MiB，SHA-256 为 `C099DAB23831B40CB4DD743522B1E67B6F8EDDCF220347A447C01D8746FC5868`。
- `docs/android-client.md` 已改为真实双公司认证真机清单，涵盖错误密码、12 小时内恢复、退出、过期重登和离线拒绝登录；本轮没有启动模拟器。
- 隔离分支已快进合并回 `codex/android-mobile-ui-atlas`；合并后再次执行 JVM 测试、Android 测试代码编译、`lintDebug` 和 APK 构建，65 个 Gradle task 全部成功，主工作树 APK 哈希与发布副本一致。

### AndroidKeyStore 登录闪退修复（已完成）

- 用户随后明确允许启动 Android 模拟器进行手工复现；API 35 模拟器已启动并配置宿主机代理。生产接口、DNS、TLS、`INTERNET` 权限及直接 POST 诊断均通过。
- 真实账号登录稳定复现进程崩溃。`logcat -b crash` 根异常为 `InvalidAlgorithmParameterException: Caller-provided IV not permitted`，调用链为 `AesGcmSessionCipher.encrypt` → `EncryptedSessionStore.write` → `AuthenticationRepository.login`。
- 根因是 AndroidKeyStore 密钥禁止调用方在加密时指定 IV，而当前实现手动生成 12 字节 IV 并传入 `Cipher.init`；普通 JVM `SecretKeySpec` 测试没有覆盖平台约束。
- 已批准的修复设计见 `docs/superpowers/specs/2026-07-17-android-keystore-login-crash-fix-design.md`：由 AndroidKeyStore 生成加密 IV、保持现有密文格式，并为会话存储失败增加不崩溃的未认证回退。
- 用户已确认书面设计；实施计划见 `docs/superpowers/plans/2026-07-17-android-keystore-login-crash-fix.md`。
- Task 1 已按 TDD 完成：新增真实 AndroidKeyStore 仪器测试，旧实现精确失败于 `Caller-provided IV not permitted`；加密现改为由 provider 生成 IV，再读取 `Cipher.iv` 与密文按既有格式保存，解密路径不变。
- GREEN 验证已通过：`EncryptedSessionStoreTest` 与 `AndroidKeystoreSessionCipherTest` 同次运行 `BUILD SUCCESSFUL`，真实 KeyStore 和普通软件 AES 密钥均可生成不同密文并正确往返。
- Task 2 已按 TDD 完成：会话写入抛出普通异常的测试先失败于未捕获 `IllegalStateException`；认证仓库现仅在持久化成功后发布已认证会话，失败时保持公开会话为空并显示“无法安全保存登录状态，请重试”。
- 复核时补充了协程取消回归：旧异常边界会吞掉 `CancellationException`，测试先失败；现会重新抛出原取消对象，只兜底真实存储异常。`AuthenticationRepositoryTest` 全类 GREEN。
- Task 3 已完成：干净 JVM/Android 编译/Lint/APK 验证通过；完整连接式 Android 测试 10/10 通过，其中包含真实 AndroidKeyStore 往返测试。
- 新 APK 已安装到 API 35 模拟器；用户使用真实账号确认可以正常登录且原闪退已解决，登录后的 crash buffer 为空。自动化测试继续覆盖会话恢复和退出清除。
- 发布副本已更新为 18,777,848 字节，SHA-256 `1FFF7347B6E0A6EC2306C16AC5DE581B71938B20B8885F7AE87F6E489E837420`。

## 用户最新决定

- 常规后续开发不需要启动 Android 模拟器；本次登录闪退排障已由用户明确允许启动，并要求记录手工测试结果。
- 保留 JVM 单元测试、Android 测试代码编译、Lint/构建检查。
- 功能完成后生成可安装 APK，放到项目发布目录并给出文件路径，由用户在真实手机上测试。
- 因此 Task 8 中的模拟器 QA 改为“构建可安装测试 APK + 提供真机测试清单”，不要启动模拟器。

### 下一阶段：真实工单 API 与 Room 缓存（设计已确认）

- 用户选择推荐方案“Room 缓存 + 在线刷新”，并确认退出登录时清除缓存；正式设计见 `docs/superpowers/specs/2026-07-17-android-orders-cache-design.md`。
- 登录后先展示当前公司缓存，再携带当前会话 Token 调用 `GET /api/orders`；成功后事务替换该公司缓存，网络失败时保留缓存，离线时不发请求。
- 401 或会话过期必须使认证会话失效并清除工单缓存；退出登录、账号或公司切换也清除缓存，避免客户资料跨账号残留。
- 工作台最近工单、员工指标和管理员指标全部改由真实工单计算，不保留演示数字；本阶段不实现工单写入、状态推进或结算。
- Room 仪器测试代码需要保留并编译；按用户决定不启动模拟器，功能完成后构建 APK 交由真实手机测试。
- 任务级实施计划已完成：`docs/superpowers/plans/2026-07-17-android-orders-cache.md`。计划锁定 Room 2.8.4、KSP2 2.3.9，分为持久层、远端 API、认证清理、缓存仓库、真实指标、生产装配和最终 APK 七个 TDD 任务。
- 用户已要求继续功能实现，并沿用当前分支内联执行；Room 缓存 Task 1 已完成，下一步执行 Task 2 认证工单 API 与容错映射。每个任务继续更新本交接文档、提交并推送。

### 真实工单与 Room 缓存 Task 1：公司隔离持久层（已完成）

- Android 工程已锁定 `androidx.room` 2.8.4 与 KSP2 2.3.9，应用 Room/KSP Gradle 插件，并配置版本化 Schema 导出目录；仪器测试同时使用 Room Testing 与协程测试库。
- 新增 `OrderEntity`，以 `companyId + orderId` 为复合主键，只保存工单展示和指标需要的日期、时间、车辆、客户、状态、金额、维修记录、保险到期与预计交车字段，不保存 Token 或会话密钥。
- 新增 `OrderDao`：按公司 Flow 查询并按 `dateSortKey / time / orderId` 稳定倒序；`replaceCompany` 在 Room 事务内只替换目标公司；`clearAll` 清除全部公司客户数据。
- 新增 `AutoserviceDatabase` Schema v1，数据库名为 `autoservice.db`，启用 Schema 导出且没有破坏性迁移回退；已生成并纳入版本控制的 `app/schemas/com.chengxu.autoservice.core.orders.cache.AutoserviceDatabase/1.json`。
- TDD RED：Android 测试源码先精确失败于 Room、`AutoserviceDatabase`、`OrderDao` 和 `OrderEntity` 不存在；GREEN 后 `OrderDaoTest` 源码可编译，覆盖稳定排序、公司隔离替换和全量清除。按用户决定未启动模拟器，因此本轮没有执行 Room 仪器测试。
- 2026-07-20 回归：Android JVM 全量 42/42 通过（0 失败、0 错误、0 跳过），`:app:compileDebugAndroidTestKotlin` 成功，生产 Room/KSP 代码与 Schema v1 均生成成功。
- 下一步执行 Task 2：实现携带当前内存会话 Bearer Token 的 `GET /api/orders`、容错 JSON 映射、401/网络/服务器/畸形响应与协程取消契约。

### 优先插入：Android 品牌化 UI 升级（设计已确认）

- 用户调整优先级：先进行 UI 升级迭代，真实工单 API 与 Room 缓存设计/计划保留但暂停执行。
- 用户提供两张汽车品牌原生应用参考图并明确调用 Product Design；参考图已持久化到 `design/mobile-ui/reference/`。
- 已选择“原生高保真转译”：颜色可按参考图重新定义，不沿用现有亮蓝风格；使用白、雾灰、浅冰蓝与近黑色构建汽车品牌应用气质，同时保留汽修业务信息架构。
- 本轮覆盖登录、员工/管理员工作台、五栏导航、“我的”和系统状态；工单/新增/档案只同步视觉壳层与高品质空状态。
- 默认使用 Hugeicons Stroke Rounded。HTML 使用官方资源，后续 Compose 使用经确认资源转换的本地 VectorDrawable；不手绘或混用图标库。
- 缺少的车辆、车间和空状态素材由内置图像生成器按实际槽位生成，需要透明底时完成透明 PNG 处理，不使用占位框或 Emoji。
- 用户确认先升级 `design/mobile-ui/` HTML 原型进行交互与视觉测试，HTML 通过后再单独规划 Compose 移植。
- 正式设计：`docs/superpowers/specs/2026-07-17-android-ui-brand-upgrade-design.md`。
- 用户已复核并批准书面设计。HTML 原型实施计划已完成：`docs/superpowers/plans/2026-07-17-html-brand-ui-prototype.md`，共六个任务：素材与 Hugeicons、设计系统四态、交互登录、五栏壳层/我的/弹层、双角色工作台、自动截图与视觉 QA。
- 用户选择在当前功能分支内联执行，不创建子代理或额外 worktree。

### HTML 品牌原型 Task 1：素材与 Hugeicons（已完成）

- 已安装官方 `@hugeicons/react@1.1.9` 与 `@hugeicons/core-free-icons@4.2.2`，建立单一 `BrandIcon` 渲染边界和受控图标映射；状态合集使用到的底部导航、离线标识和系统状态图标已迁移，不再混用 Lucide。
- 已使用内置 ImageGen 按参考图的冷色汽车应用气质分别生成车辆 Hero 与维修工具空状态素材，再使用官方技能附带的色键去底工具本地移除背景；最终文件为 `design/mobile-ui/public/brand-assets/login-service-vehicle.png`（716×500 RGBA）和 `empty-service-tools.png`（440×330 RGBA）。
- 两张 PNG 的四个角 Alpha 均为 0，Alpha 范围均为 0–255；素材无品牌标记、文字、水印和人物，并已登记到 `asset-manifest.js`，状态合集会实际加载两张图片用于自动校验。
- TDD 记录：`brand-assets.spec.mjs` 先失败于缺少 `[data-brand-icon]`，实现后聚焦测试 1/1 通过；完整网页单元测试 64/64、移动 UI 回归 80/80 通过。

### HTML 品牌原型 Task 2：品牌令牌与交互状态（已完成）

- `tokens.css` 已切换为参考图导向的白、雾灰、浅冰蓝与近黑色令牌，并通过 `--atlas-*` 别名维持旧页面兼容；壳层圆角、面板圆角、阴影和动效速度均统一到品牌变量。
- 已新增 `InteractiveSurface`、`BrandButton`、`BrandField` 三个共享原语；`MetricCard` 与 `StatusPill` 已改用共享交互边界和 Hugeicons。按钮及卡片的触控高度至少 48px，支持键盘聚焦、`aria-pressed`、原生禁用与 reduced-motion。
- 系统状态合集新增完整交互矩阵：主按钮、图标按钮、导航项、选择卡、指标卡、输入字段和弹层动作均展示默认、悬停、按下、聚焦和禁用状态；导航项与选择卡另含选中态，实时示例可点击切换。
- TDD 记录：`brand-states.spec.mjs` 先失败于缺少矩阵和实时控件；实现后 2/2 通过，并验证悬停背景变化、强制聚焦轮廓、按下变换、选中语义与禁用透明度。完整网页单元测试 64/64、移动 UI 回归 82/82 通过。

### HTML 品牌原型 Task 3：交互登录与原型状态机（已完成）

- 已新增纯函数 `prototypeReducer` 和不可变初始状态，覆盖企业、账号、密码、显隐、校验、提交、成功/失败、角色、五栏标签、覆盖层与退出事件；登录成功会清空密码和显隐状态，退出恢复全新未认证状态。
- `?prototype=brand` 现在进入状态化原型；登录使用生成的透明车辆 Hero、两张真实企业选择卡、共享品牌字段和按钮，支持 Enter 提交、密码显隐、字段错误、提交中禁用及模拟失败信息。
- `?screen=login-company` 保持确定性截图路由并复用同一生产组件；页面在 360×800、390×844、412×915 均无横向溢出，390×844 首屏可直接看到 52px 高主操作。
- 原型只用 480ms 本地计时模拟认证，不调用任何生产 API、不持久化账号密码；DOM 文本不会渲染密码值。登录成功目前进入现有员工/管理员工作台，状态化五栏壳层将在 Task 4 接管。
- TDD 记录：reducer 测试先失败于模块不存在，浏览器测试先失败于缺少校验和状态化企业卡；实现后 reducer 4/4、登录浏览器 5/5 通过。完整网页单元测试 64/64、移动 UI 回归 87/87 通过。

### HTML 品牌原型 Task 4：五栏壳层、阶段页与退出弹层（已完成）

- 状态化原型已接管“工作台 / 工单 / 新增 / 档案 / 我的”五个标签；每项都是至少 48px 的真实按钮，点击后同步更新 `aria-current`、标题和主内容，底部导航固定而主区域独立滚动。
- 工单、新增、档案使用生成的透明维修工具素材和诚实阶段说明，不伪造业务写入；离线原型 `?prototype=brand&offline=1` 显示只读横幅并原生禁用中央“新增”。
- “我的”展示身份、企业、同步与安全信息；退出确认使用 `role=dialog`、`aria-modal`、安全动作初始焦点、Tab 环、Escape 关闭、背景滚动锁定和触发按钮焦点恢复，确认后清空原型会话并返回登录。
- TDD 记录：`brand-shell.spec.mjs` 先失败于导航无状态、无退出入口和离线新增未禁用；实现后 3/3 通过。完整网页单元测试 64/64、移动 UI 回归 90/90 通过。
- Task 4 实现提交：`6d42141`，已推送到 `origin/codex/android-mobile-ui-atlas`。

### HTML 品牌原型 Task 5：员工/管理员双角色工作台（已完成）

- `?prototype=brand` 的工作台已由临时阶段页升级为完整业务首页：员工侧展示今日接车、在修车辆、待交付和保险到期，管理员侧展示本月产值、待结算金额、在修车辆和保险到期；两种角色共享工单状态带、快捷操作和近期工单，但结算入口只对管理员显示。
- 原型提供仅用于设计验证的“员工 / 管理员”角色切换；角色状态由既有 reducer 管理，切换到“我的”再返回工作台后仍保持当前角色。管理员页标题、问候语、经营指标和优先事项会同步切换，不伪造生产权限切换入口。
- 指标卡、工单状态、快捷操作、查看全部和近期工单均使用真实按钮语义；工单卡整体可点击、可键盘聚焦，并复用 Hugeicons 箭头。所有控件继承默认、悬停、按下、聚焦、选中和禁用反馈。
- 布局按 390×844 移动端基准完成，并验证 360×800 无横向溢出；顶部信息区、角色切换、四列状态带、两列指标、三列快捷操作和固定五栏导航在窄屏保持可读、可触达，主内容独立滚动。
- TDD 记录：`brand-workbench.spec.mjs` 先失败于双角色工作台尚未接入，第二轮先失败于快捷入口没有页面状态变化；完成实现后聚焦测试 3/3 通过。2026-07-20 全量网页单元测试 64/64、移动 UI Playwright 93/93 通过，生产构建成功。未启动 Android 模拟器。
- 下一步执行 HTML 品牌原型 Task 6：补充最终状态截图与响应式检查，把参考图和原型截图放在同一视觉对比输入中完成 Design QA，修复 P0/P1/P2 后更新 `docs/mobile-ui-atlas.md` 并交付本地预览。

### HTML 品牌原型 Task 6：自动截图、视觉 QA 与原型交付（已完成）

- 新增 `brand-accessibility.spec.mjs`，覆盖 48px 触控目标、键盘可见焦点、`aria-pressed` / `aria-current` 非颜色语义、离线禁用不响应、退出弹层焦点循环与返回，以及 360×800、390×844、412×915 三档无横向溢出。
- 截图流程新增状态化品牌原型：登录、员工/管理员工作台、个人页、离线态、退出弹层，以及 hover / pressed / focus / disabled 四张状态证据；同时保留登录、双工作台、Profile、离线、确认弹层、底部 Sheet 和状态合集等既有图集输出。
- 已将两张参考图与 390×844 原型截图放在同一输入中复核，并生成 `qa-login-comparison.png`、`qa-workbench-comparison.png`、`qa-overlay-comparison.png` 三张同屏板。首轮 P2（40px 查看全部、管理员副标题换行、跨页姓名不一致）均已修复；`design/mobile-ui/design-qa.md` 最终结果为 `passed`。
- 浏览器主流程“登录 → 管理员 → 五栏导航 → 我的 → 取消退出 → 确认退出”通过，控制台错误与页面异常均为 0；未启动 Android 模拟器。
- 2026-07-20 最终验证：网页单元测试 64/64、移动 UI Playwright 108/108、确定性截图 34/34；`dist/mobile-ui-prototype` 独立原型构建与仓库生产构建均成功。Task 6 提交推送后，下一阶段先以当前 HTML 真值单独规划 Compose 品牌 UI 移植；真实工单 API 与 Room 缓存继续暂停。

### Compose 品牌 UI 移植设计（已确认）

- 用户确认 HTML 品牌原型达到预期，并选择推荐的“组件优先、完整页面纵向迁移”方案；该方案不会缩减演示效果，只把风险拆分到可独立验证的阶段。
- 正式设计：`docs/superpowers/specs/2026-07-20-android-compose-brand-ui-migration-design.md`。
- 移植范围包含恢复中、登录与双公司选择、员工/管理员工作台、Navigation 3 五栏壳层、工单/新增/档案阶段页、“我的”、退出弹窗和离线状态。
- Compose 继续复用真实认证、会话、权限、Navigation 3、离线门禁和工作台状态模型；Android 不加入原型调试角色切换器，也不提前实现工单写入或 Room 缓存。
- 品牌 Token 锁定 HTML 原型色值和 16/20dp 圆角体系；Hugeicons 转为本地 VectorDrawable，并复用两张已验证透明 PNG，不混用 Material Icons、自制 SVG 或 Emoji。
- 实施拟分为五个重要提交：设计系统与资产、登录、壳层/阶段页/我的、双角色工作台、最终验证与 APK。每阶段继续更新本文件、提交并推送。
- 验证保留 JVM 单元测试、Android 测试代码编译、`lintDebug` 和 Debug APK 构建；不启动模拟器，最终 APK 交由用户在真实手机上完成视觉与触控验收。
- 用户已复核并批准书面设计。任务级实施计划已完成：`docs/superpowers/plans/2026-07-20-android-compose-brand-ui-migration.md`。
- 计划分为五个 TDD 任务：品牌设计系统/官方 Hugeicons 转换/图片资产、品牌登录、五栏壳层/阶段页/我的/退出、双角色工作台、最终干净验证与真机 APK。
- 用户此前已选择当前分支内联执行，不创建子代理或额外 worktree；Compose 品牌 UI Task 1–5 已全部完成，当前 APK 等待真实手机验收。

### Compose 品牌 UI Task 1：设计系统、Hugeicons 与图片资产（已完成）

- Android 品牌 Token 已锁定 HTML 原型：Canvas `#F4F6F8`、Surface `#FFFFFF`、Surface Soft `#F0F3F7`、Ice `#EAF1FB`、Ink `#101214`、Ink Muted `#697079`、Line `#E3E7EC`、Action `#111315`、Success `#25805F`、Warning `#A96816`、Danger `#B84A45`。
- Material 3 全部颜色槽继续只映射到批准色板；页面/弹层使用 20dp，卡片和控件使用 16dp，动效基准为 120/180ms，中文系统字体保持零额外字距。
- 新增 `BrandButton`、`BrandTextField`、`CompanySelectionCard`、`BrandIcon` 和 `BrandConfirmDialog` 共享边界；按钮具备至少 48dp 触控高度、按下缩放、加载、禁用与四种受控语义色调，不公开任意颜色入口。
- 新增可重复执行的 `scripts/export-hugeicons-to-vector.mjs`；从官方 `@hugeicons/core-free-icons@4.2.2` 路径数据生成 24 个本地 24dp VectorDrawable，Node 合同测试 1/1 通过。来源、版本与 MIT 许可已记录在 `android-client/THIRD_PARTY_NOTICES.md`。
- 已原样复制品牌图片到 Android `drawable-nodpi`：车辆图 716×500、工具图 440×330；与 HTML 源文件 SHA-256 一致，四角 Alpha 均为 0，并已完成视觉检查。
- TDD RED：Node 测试先失败于导出器不存在；主题 JVM 测试先失败于品牌 Token 与圆角/动效合同不存在。GREEN 后 Android 全量 JVM 测试 42/42 通过（0 失败、0 错误、0 跳过）。
- `:app:compileDebugAndroidTestKotlin` 与 `:app:lintDebug` 均 `BUILD SUCCESSFUL`；Lint 0 错误，新增图片在 Task 2/3 消费前仅报告预期的未使用资源警告。本阶段未启动 Android 模拟器。
- 下一步执行 Task 2：品牌恢复中与登录体验；继续复用现有 `LoginViewModel` 和真实认证仓库，不改变认证业务逻辑。

### Compose 品牌 UI Task 2：品牌恢复中与登录体验（已完成）

- `AuthenticationState.Restoring` 已升级为品牌恢复页：雾灰画布、冰蓝车辆图标容器、近黑色进度指示和“正在安全恢复登录状态”，恢复完成前不渲染姓名、企业或上一会话内容。
- 登录页已按获批 HTML 真值移植：浅冰蓝 Hero、“让每一次服务更从容”标题、716×500 透明车辆主视觉，以及向上叠放的 20dp 白色登录面板。
- 原下拉企业选择已替换为两张真实选择卡，显示通达/鑫齐恒企业名和公司全称；选中态同时使用容器、边框、勾选图标与 RadioButton 语义，提交中真实禁用。
- 账号和密码已使用共享 `BrandTextField`；密码尾部支持“显示密码/隐藏密码”可访问动作，IME Done 继续触发现有登录回调。主按钮使用近黑色“进入系统”，提交中显示进度并阻止重复提交。
- 页面保持 `imePadding` 与纵向滚动，新增 360dp 登录主操作可达测试代码；登录仍完全复用 `LoginViewModel`、真实认证仓库、原错误文案、离线拒绝和成功后清空密码逻辑。
- TDD RED：Android 测试代码先失败于 `LoginTestTags` 及新企业卡/密码动作合同不存在；实现后 `:app:compileDebugAndroidTestKotlin` 成功。Android JVM 全量 42/42 通过，Lint 0 错误、12 个非阻塞基线警告；本阶段未启动 Android 模拟器。
- Task 3 已完成；下一步执行 Task 4：员工与管理员双角色品牌工作台。

### Compose 品牌 UI Task 3：五栏壳层、阶段页、我的与退出确认（已完成）

- Navigation 3 五栏继续保持“工作台 / 工单 / 新增 / 档案 / 我的”和五个独立返回栈；底栏已替换为本地 Hugeicons，普通选中项使用 Ice/Ink 与半粗标签，中间“新增”为 48dp 近黑圆形主操作。
- 离线时继续显示精确文案“网络不可用，当前为只读模式”，使用品牌离线图标与冰蓝条幅；第三项“新增”保持禁用，阶段页中的新增按钮也不可用。
- 新增 `StageKind` 三个真实边界：工单、创建和档案分别显示已批准标题、阶段说明、透明工具图与只读说明按钮；按钮仅展示真实说明 Snackbar，不伪造业务写入结果。
- “我的”页显示员工姓名、企业、角色、“刚刚同步”和“登录状态已加密保存在本机”；离线状态显示本机同步说明。退出操作先打开 20dp 品牌确认弹窗，取消/系统返回后把焦点还给退出按钮，仅确认才清除会话。
- 工作台允许动作按既有 `AppPermission` 路由：创建进入“新增”，状态推进与结算进入“工单”；权限拒绝仍由 `MutationGate` 原因留在工作台展示，没有绕过权限或离线门禁。
- TDD RED：Android 测试源码先失败于 `StageKind` 与退出弹窗测试标签不存在；GREEN 后五栏/阶段与双击退出流程测试源码成功编译。
- 2026-07-20 全量验证：Android JVM 42/42 通过（0 失败、0 错误、0 跳过），`:app:compileDebugAndroidTestKotlin` 与 `:app:lintDebug` 均 `BUILD SUCCESSFUL`；Lint 0 错误、11 个非阻塞基线警告。本阶段未启动 Android 模拟器，也未提前生成最终 APK。
- Task 4 已完成；下一步执行 Task 5：干净验证、发布 APK 与真机测试清单。

### Compose 品牌 UI Task 4：员工与管理员双角色工作台（已完成）

- `WorkbenchUiState` 新增角色无关的 `statusMetrics`，生产 ViewModel 为员工和管理员统一提供四项状态带：新建 `06`、在修 `18`、待结算 `05`、保险到期 `09`；没有改变仓库、会话角色或权限映射。
- 员工与管理员已合并为同一品牌工作台组合：冰蓝 Hero 显示真实姓名、企业、在线/离线状态，四列等宽状态带在 360dp 内保持无横向滚动；角色只通过既有指标和动作数据决定“今日概览/经营概览”及“我的待办/优先事项”。
- 指标保持两列品牌卡片；快捷操作使用 48dp 以上的次级按钮和按权限映射的本地 Hugeicons（新增/维修/结算），不在 UI 内重新推断角色可见性。
- 近期工单已升级为整卡可点击语义，显示车牌、客户、维修摘要、状态、工单号、金额和箭头图标；当前仅展示“详情将在后续阶段接入”的诚实 Snackbar，不伪造工单详情或写入。
- `MutationDecision.Allowed` 继续交给五栏壳层路由，创建进入“新增”，推进/结算进入“工单”；拒绝动作仍显示 `MutationDecision.Denied.reason` 原文，离线和权限门禁没有旁路。
- TDD RED：JVM/Android 测试源码先精确失败于缺少 `statusMetrics`；GREEN 后 ViewModel 测试锁定四个标签和值，并增加员工/管理员品牌分区、可点击动作/工单卡、360dp 长企业名及允许创建跳转契约。
- 2026-07-20 验证：Android JVM 全量 42/42 通过（0 失败、0 错误、0 跳过）；`:app:compileDebugAndroidTestKotlin`、`:app:lintDebug`、`:app:assembleDebug` 均 `BUILD SUCCESSFUL`，Lint 0 错误、11 个非阻塞基线警告。构建产物为 19,077,522 字节，本阶段未启动 Android 模拟器，也未覆盖最终发布副本。
- Task 5 已完成；当前等待用户在真实手机上按 `docs/android-client.md` 完成品牌 UI 验收。

### Compose 品牌 UI Task 5：最终验证、可安装 APK 与真机交接（已完成）

- 最终 Android 测试源码补齐了企业卡、密码可见性、快捷操作、工单卡和中央新增项的 48dp 触控高度契约，并显式锁定五栏顺序；既有双角色、离线拒绝、退出确认与 360dp 长企业名契约全部保留。
- 2026-07-20 从干净 Gradle 状态执行 `clean :app:testDebugUnitTest :app:compileDebugAndroidTestKotlin :app:lintDebug :app:assembleDebug`，66 个 task 全部重新执行并 `BUILD SUCCESSFUL`。
- JVM 全量 42/42 通过（0 失败、0 错误、0 跳过）；Android 测试源码编译成功；Lint 0 错误、11 个非阻塞警告；Debug APK 构建成功。本轮严格未启动 Android 模拟器，也未执行连接式测试。
- 可安装 API 26+ Debug APK 已复制到 `dist/releases/android/autoservice-android-debug-0.1.0.apk`，大小 19,077,522 字节，SHA-256 `6D1A2990A3727DAD2703C55373B0581860BC7699C07FD225D254FE6F96B6AE2A`；构建源文件与发布副本哈希完全一致，`apksigner verify` 确认 v2 Debug 签名有效。
- `docs/android-client.md` 已新增“品牌 UI 真机验收”清单，覆盖双企业选择、输入法/校验、真实员工与管理员、五栏导航、离线只读、退出确认、360dp/系统栏/裁切检查。
- 当前品牌 UI 迁移范围已全部交付；真实工单 API 与 Room 缓存仍按既有设计/计划暂停，待真机视觉与触控反馈确认后再继续。

### 真实工单与 Room 缓存 Task 2：认证工单 API 与容错映射（已完成）

- 新增 `RepairOrder`、`OrdersApi`、`OrdersResult` 与 `OrdersFailure`，金额统一以分存储；完整日期保留为 `yyyy-MM-dd`，`MM-dd` 注入当前年份，非法日期使用空排序键。
- 新增 `HttpUrlConnectionOrdersApi` 与可注入的 `OrdersHttpTransport`：调用 `GET /api/orders`，发送 `Accept: application/json` 与 `Authorization: Bearer <token>`，连接和读取超时均为 10 秒，并保证断开连接。
- 远端结果明确区分成功、401 会话失效、网络不可用、服务端错误和异常响应；JSON 未知字段会忽略，可选字段类型异常会回退为空，非法或负数金额回退为 0；协程取消保持原对象向上传播。
- TDD RED 已确认生产类型缺失时聚焦测试失败；GREEN 后 `HttpUrlConnectionOrdersApiTest` 8/8 通过。2026-07-20 全量验证为 JVM 50/50（0 失败、0 错误、0 跳过），`:app:compileDebugAndroidTestKotlin` 与 `:app:lintDebug` 均 `BUILD SUCCESSFUL`，本阶段未启动 Android 模拟器。
- 下一步执行真实工单与 Room 缓存 Task 3：由认证生命周期统一清理客户数据缓存，覆盖无有效恢复、退出、会话失效与取消传播。

### 真实工单与 Room 缓存 Task 3：认证生命周期客户数据清理（已完成）

- 新增窄边界 `AuthenticatedDataCleaner`，`AuthenticationRepository` 现在必须显式接收清理器；无有效会话恢复、退出登录和会话失效都会执行一次客户数据清理。
- 清理严格发生在公开 `session` 置空和发布 `Unauthenticated` 之前；清理器抛出的 `CancellationException` 保持原对象向上传播，认证状态不会被错误推进。
- 生产装配已创建 `AutoserviceDatabase`，并把 `OrderDao.clearAll()` 作为 Room 后备清理器显式注入；无 Token、账号或密码写入工单数据库。
- TDD RED 已确认清理接口和构造参数缺失；GREEN 后新增无效恢复、退出、失效和取消传播 4 个生命周期测试。2026-07-20 全量 JVM 54/54（0 失败、0 错误、0 跳过），`:app:compileDebugAndroidTestKotlin` 与 `:app:lintDebug` 均 `BUILD SUCCESSFUL`，未启动 Android 模拟器。
- 下一步执行 Task 4：实现公司隔离、缓存优先、离线不请求、刷新去重、401 清缓存后失效会话的 `CachedOrdersRepository`。

### 真实工单与 Room 缓存 Task 4：缓存优先工单仓库（已完成）

- 新增 `OrdersRepository`、`OrdersSnapshot`、`OrderSyncState`、`OrderCache` 与 `SessionInvalidator` 契约，并实现 `CachedOrdersRepository` 和 `RoomOrderCache`。
- 登录后先订阅当前公司的 Room 数据，再在在线状态携带内存会话 Token 刷新；离线状态不会调用工单 API。成功响应只替换当前公司数据，远端 `companyId` 会被可信会话公司强制覆盖。
- 刷新失败保留已有卡片并发布精确的 stale 提示；空缓存失败保持可重试状态。`Mutex.tryLock()` 会丢弃重复刷新而不排队；协程取消保持向上传播。
- 401 顺序固定为先清空公开行和本地缓存，再调用会话失效器；同公司换账号或跨公司直接切换会先清空全部缓存，旧公司的 Flow 不会继续向新身份发布数据。
- 生产认证清理器现复用单一 `RoomOrderCache` 实例。Task 4 聚焦测试 10/10 通过；2026-07-20 全量 JVM 64/64（0 失败、0 错误、0 跳过），`:app:compileDebugAndroidTestKotlin` 与 `:app:lintDebug` 均 `BUILD SUCCESSFUL`，未启动 Android 模拟器。
- 下一步执行 Task 5：用真实工单计算员工/管理员指标和最近工单展示，移除 `DemoWorkbenchRepository` 与固定演示数字。

### 真实工单与 Room 缓存 Task 5：真实工作台指标与展示映射（已完成）

- 新增纯函数 `WorkbenchMetrics.kt`，所有指标使用注入 `Clock` 得到的本地日期计算。员工口径为今日接车、在修中、已完工待交付和 3 日内/已逾期保险；管理员口径为本月工单金额、待结算金额与单数、在修中和 7 日内/已逾期保险。
- 金额统一从分格式化为人民币符号和千分位，仅在存在非零分值时显示两位小数；非法/负数值安全回退为 `¥0`。日期无效时不计入今日、本月或保险窗口。
- 最近工单按日期、时间和稳定 ID 倒序；摘要优先维修记录，其次为“车型 · 类型”，最后回退“暂无维修说明”。服务端状态原文保持可见，`在修中/已完工/待结算/已结算` 映射到批准的状态色，未知状态使用中性主色回退。
- `WorkbenchViewModel` 现直接消费 `OrdersRepository.snapshot`，公开 `loading/refreshing/syncMessage/showRetry` 并提供 `refresh()`；固定员工/管理员指标、`DemoWorkbenchRepository` 和旧 `WorkbenchRepository` 已全部删除。
- `MainActivity` 已完成真实 Room、认证工单 API、缓存仓库和 401 会话失效器的生产接线；`AutoserviceApp` 与测试夹具改为接收 `OrdersRepository`。
- TDD RED 已确认真实指标、同步字段和新构造契约缺失；GREEN 后 Workbench 聚焦测试 14/14。2026-07-20 全量 JVM 75/75（0 失败、0 错误、0 跳过），Android 测试源码编译与 Lint 均 `BUILD SUCCESSFUL`，未启动 Android 模拟器。
- 下一步执行 Task 6：在 Compose 工作台呈现同步/陈旧/空状态与“重新同步”，贯通刷新回调并补齐 Android UI 测试。

### 真实工单与 Room 缓存 Task 6：同步状态、重试与生产装配（已完成）

- `WorkbenchScreen` 现在展示 `正在同步…`、陈旧数据原因和“重新同步”按钮；空列表在非加载状态显示“暂无工单数据”。只要已有缓存卡片，就不会被全屏加载状态替换。
- 刷新回调已从 `AuthenticatedRoot` 经 `AutoserviceShell`、`AppNavDisplay` 贯通到 `WorkbenchScreen`，点击“重新同步”调用 `WorkbenchViewModel.refresh()` 一次。
- Compose 测试源码新增 4 个场景：空缓存陈旧态、带缓存陈旧态、刷新中保留卡片、重试点击一次。TDD RED 精确失败于 `onRefresh` 参数缺失，GREEN 后 Android 测试源码编译成功；按约定未启动模拟器、未运行连接式 UI 测试。
- 生产装配使用单一 `RoomOrderCache`，依次连接 `AuthenticationRepository`、`AndroidConnectivityNetworkMonitor`、`HttpUrlConnectionOrdersApi` 和 `CachedOrdersRepository`；401 通过 `SessionInvalidator` 回到认证失效流程。
- 2026-07-20 验证命令 `:app:testDebugUnitTest :app:compileDebugAndroidTestKotlin :app:lintDebug :app:assembleDebug` 为 `BUILD SUCCESSFUL`；JVM 75/75，Android 测试源码编译、Lint 和 Debug APK 构建均成功，未启动 Android 模拟器。
- 下一步执行 Task 7：从 clean 状态做最终全量验证，更新 Android 真机清单，发布并哈希可安装 APK，确认本地与远端提交一致。

### 真实工单与 Room 缓存 Task 7：最终验证、APK 与真机交接（已完成）

- 2026-07-20 从 clean 状态执行 `clean :app:testDebugUnitTest :app:compileDebugAndroidTestKotlin :app:lintDebug :app:assembleDebug --rerun-tasks`，69 个 Gradle task 全部重新执行并 `BUILD SUCCESSFUL`。
- JVM XML 客观统计为 16 个 suite、75/75 测试、0 失败、0 错误、0 跳过；Android 测试 Kotlin 编译完成。Lint XML 为 0 Fatal、0 Error、11 Warning。
- 源码扫描确认 `DemoWorkbenchRepository`、固定“今日接车 12”和固定“本月产值 286,400”均无匹配。Room DAO 仪器测试与 Compose UI 场景只完成源码编译，因本轮未启动模拟器而未运行，不能声称设备测试通过。
- 可安装 API 26+ Debug APK：`E:\codex\chengxu\dist\releases\android\autoservice-android-debug-0.1.0.apk`；19,425,946 字节；SHA-256 `E0287D74755796C3E1CED1E5EED306E2EA38F8F780798C11E7A467255D125268`。发布副本与构建源哈希一致，`apksigner verify` 确认 v2 签名有效。
- `docs/android-client.md` 已加入真实工单/缓存真机清单，覆盖缓存优先重启、在线刷新、飞行模式缓存、空缓存离线、网络恢复、双公司/换账号隔离、退出清理、401 回登录、真实指标与无写入能力。
- 真实工单 API + Room 缓存只读里程碑代码已全部完成；剩余工作是由用户在真实手机执行上述清单并反馈视觉、网络与生产数据结果。后续产品里程碑可在真机验收后规划工单详情或受权限控制的写入流程。

### Android 紧凑自适应登录页（设计已确认，实施计划已完成）

- 用户针对真机截图反馈：当前登录页纵向冗长，白色表单过度遮挡车辆背景，账号、密码和主按钮需要滚动才能到达；目标是常见手机首屏无需滚动完成登录。
- 用户已选择推荐方案 A：常规态使用紧凑 Hero + 纵向紧凑企业卡，输入法弹出时进一步压缩 Hero；企业卡继续保证 48dp 以上触控尺寸。
- 正式设计规格见 `docs/superpowers/specs/2026-07-20-android-compact-login-design.md`：360×800dp 默认状态直接显示完整主按钮，390×844dp 同时显示安全说明；极小屏幕、大字号和输入法场景保留滚动作为无障碍兜底。
- 本阶段只调整 Compose 登录布局与复用组件，不改变认证、公司 ID、会话、网络、Keystore 或工单缓存逻辑；不需要新图片，继续使用现有车辆资产和本地 Hugeicons。
- 用户已确认书面规格；任务级实施计划见 `docs/superpowers/plans/2026-07-20-android-compact-login.md`。计划分为可执行布局策略、360×800 紧凑 Compose 布局、完整验证与 APK 三个 TDD 任务。
- 用户沿用此前选择的内联执行方式；下一步直接执行 Task 1，不创建子代理或 worktree。代码阶段仍不启动 Android 模拟器，保留 JVM 测试、Android 测试代码编译、Lint、APK 构建和真机交接。

#### 紧凑登录页 Task 1：可执行布局策略（已完成）

- 新增纯 Kotlin/Compose 尺寸策略 `loginLayoutSpec(imeVisible)`：常规态固定 200dp Hero、显示营销标题与车辆；IME 可见时切换为 96dp 上下文 Hero，并隐藏营销标题与车辆；两种状态的面板覆盖量均为 16dp。
- TDD RED 已客观失败于 `loginLayoutSpec` 不存在；补入最小实现后，聚焦 `LoginLayoutPolicyTest` 2/2 通过并 `BUILD SUCCESSFUL`。
- 下一步执行 Task 2：先让 360×800 Compose 布局契约因缺少新语义标签而编译失败，再实现紧凑企业卡、IME 检测和首屏无滚动登录布局。

#### 紧凑登录页 Task 2：360×800 契约与自适应 Compose 布局（已完成）

- Compose 契约已改为在 360×800dp 根布局中直接断言 200dp Hero、两张 56dp 企业卡和至少 48dp 主按钮可见，完全移除 `performScrollTo()`；按约定只编译 Android 测试源码，未启动模拟器、未声称该设备测试已执行。
- `CompanySelectionCard` 新增默认关闭的 `compact` 模式，登录页显式使用 56dp 紧凑卡并隐藏完整工商登记名称；其他调用方继续保持原 72dp 最小高度、颜色、边框、Hugeicons、选择和禁用语义。
- 登录 Hero 常规态缩至 200dp，保留冰蓝背景、品牌眉题、两行标题和现有车辆资产；车辆使用适配透明画布的 154dp 图片槽。表单仅覆盖 16dp，删除重复“欢迎回来”和 Hero 副标题，表单内边距收敛至 16dp，安全说明改为水平单行。
- Compose 通过 `WindowInsets.ime.getBottom(LocalDensity.current)` 判断输入法可见性，IME 打开时切换为 96dp 上下文 Hero 并隐藏车辆；账号、密码、企业、错误和提交状态不因布局切换而重建。
- TDD RED 已精确失败于新增 `HERO`、`PRIMARY_ACTION` 标签不存在；实现后聚焦布局策略 2/2 通过且 Android 测试 Kotlin 编译成功。期间构建暴露 Compose 1.11.3 的 `getBottom` 是 `WindowInsets` 成员而非顶层扩展，已用本地 AAR 字节码确认根因并仅移除错误导入；同一 GREEN 命令随后 `BUILD SUCCESSFUL`。
- 下一步执行 Task 3：从 clean 状态跑完整 JVM/Android 测试源码/Lint/APK 验证，更新真机清单并发布新的可安装 APK。

#### 紧凑登录页 Task 3：最终验证、APK 与真机交接（已完成）

- 2026-07-20 从 clean 状态执行 `clean :app:testDebugUnitTest :app:compileDebugAndroidTestKotlin :app:lintDebug :app:assembleDebug --rerun-tasks`，69 个 Gradle task 全部重新执行并 `BUILD SUCCESSFUL`。
- JVM XML 客观统计为 17 个 suite、77/77 测试、0 失败、0 错误、0 跳过；Android 测试 Kotlin 编译完成。Lint XML 为 0 Fatal、0 Error、11 Warning。
- 最终代码复核检查了源车辆 PNG 的 768×512 透明边界：104dp 图片槽会让实际车辆主体过小。已按 TDD 为布局策略增加 `vehicleSlotHeight`，常规态使用 154dp 槽、IME 态使用 0dp；在 200dp Hero 内可见车辆主体约 60dp，并结束于 16dp 面板覆盖区上方。新增断言先精确失败于字段不存在，补入策略后聚焦 2/2 通过。
- 调整后重新从 clean 状态完整验证；新的 API 26+ Debug APK 已复制到 `E:\codex\chengxu\dist\releases\android\autoservice-android-debug-0.1.0.apk`，大小 19,425,946 字节，SHA-256 `3988F3BD15BB8667C3C590C7982163BA121487888B2AADBCBED8E1F90BDD48A9`；发布副本与 clean 构建源哈希一致，`apksigner verify` 确认 v2 签名有效。
- `docs/android-client.md` 已补充紧凑登录页真机清单：360×800dp 首屏无滚动主按钮、车辆遮挡、56dp 企业卡、IME 96dp Hero、390×844dp 安全说明、字体缩放、密码显隐、加载/错误和双公司真实登录。
- 本轮严格未启动 Android 模拟器、未执行连接式 Compose/Room 测试，也没有生成原生界面截图；因此自动化证据覆盖布局策略、源码契约、编译、Lint 与构建，最终视觉和真实输入法行为由用户安装本 APK 后在真机验收。

### 下一里程碑：Android 只读工单中心（设计与实施计划已确认）

- 用户已确认推荐方案：一次完成真实工单列表与详情，复用现有 `OrdersRepository`、公司隔离 Room 缓存和 `AppRoute.OrderDetail`，不修改服务端接口或 Room Schema。
- “工单”页将支持本地搜索工单号/车牌/客户/车型/维修记录、固定状态筛选、加载/刷新/陈旧/离线/空列表/无匹配状态以及重新同步；未知状态仅在“全部”中保留原文展示。
- 工单详情仅使用现有缓存字段，展示工单号、日期时间、车牌、客户、车型、类型、维修记录、状态、总金额、保险到期和预计交车；不缓存手机号、VIN、理赔号等额外敏感字段。
- 从“工单”和工作台最近工单均可进入同一详情页面，并保留各根标签独立返回栈；当前工单在刷新后消失时显示失效状态，不继续展示旧对象。
- 本里程碑严格只读，不实现新增、编辑、状态推进、结算、作废、服务端搜索或离线写入。正式设计规格见 `docs/superpowers/specs/2026-07-20-android-read-only-orders-center-design.md`。
- 用户已确认书面规格；任务级实施计划见 `docs/superpowers/plans/2026-07-20-android-read-only-orders-center.md`，依次覆盖展示映射/ViewModel、真实列表、详情与 Navigation 3 装配、最终 APK 四个 TDD 任务。
- 沿用用户此前选择的内联执行方式，不创建子代理或 worktree。继续不启动 Android 模拟器，保留 JVM 测试、Android 测试代码编译、Lint、APK 构建与真机交接。

#### 只读工单中心 Task 1：展示映射、筛选与会话级状态（已完成）

- 新增 `OrderDisplayModel`、固定五项 `OrderStatusFilter`、状态色调与 `OrdersUiState`；映射会修剪服务端字段，为缺失值提供安全文案，保留未知状态原文，并按现有规则格式化金额。
- 展示模型额外保留独立 `record` 字段，这是详情页逐字段展示维修记录所必需；搜索严格只覆盖工单号、车牌、客户、车型和维修记录，不向服务端发请求，筛选与搜索取交集且不改变仓库原始顺序。
- 新增会话级 `OrdersViewModel`，组合现有 `OrdersRepository.snapshot` 与本地查询/筛选状态；加载、刷新、陈旧提示、重试标记、真空列表和无匹配均由统一状态表达，刷新不会清空查询或筛选，仓库移除工单后 `allOrders` 会同步失效。
- TDD RED 分别精确失败于映射 API 和 `OrdersViewModel` 不存在；补入最小实现后，聚焦映射/ViewModel 测试通过。完整 `:app:testDebugUnitTest` 为 19 个 suite、90/90 测试、0 失败、0 错误并 `BUILD SUCCESSFUL`。
- Task 2 已继续完成，见下节。

#### 只读工单中心 Task 2：真实缓存工单列表（已完成）

- 新增 `OrdersScreen` 与组件层：页头显示当前搜索/筛选结果数，搜索框和五项横向滚动状态筛选直接绑定 Task 1 状态；列表严格渲染 `visibleOrders`，不会在界面层重排或发起服务端搜索。
- 工单卡片展示车牌/客户、维修摘要、日期时间、金额、工单号和原始状态，整卡至少 48dp 且可点击；筛选控件、重试和清除筛选均至少 48dp，并使用现有浅色科技 Token、Surface、圆角和本地 Hugeicons。
- 加载、刷新保留缓存、陈旧提示、在线重试、离线隐藏重试、真空列表和有数据但无匹配均已按决策表区分；未知状态在“全部”下保留原文，并新增 `StatusTone.NEUTRAL` 显示为中性灰色，避免误传业务状态。
- Compose 契约先精确 RED 于 `OrdersScreen`/`OrdersTestTags` 不存在；实现后 `:app:compileDebugAndroidTestKotlin` 成功。配套 JVM 单测先精确 RED 于中性色映射不存在，补入实现后完整 JVM 为 19 个 suite、91/91 测试、0 失败、0 错误；组合命令 `:app:compileDebugAndroidTestKotlin :app:testDebugUnitTest` 已 `BUILD SUCCESSFUL`。
- 本阶段未启动模拟器，Compose 测试只完成源码编译，未声称连接式执行或原生视觉对比。Task 3 已继续完成，见下节。

#### 只读工单中心 Task 3：详情、双入口与 Navigation 3 装配（已完成）

- 新增只读 `OrderDetailScreen`，按“工单信息 / 车辆与服务 / 交付与保障 / 费用”四区展示已缓存字段；顶部与失效态返回控件均至少 48dp，工单被刷新移除后显示“工单不存在或已失效”，不保留旧对象，也不提供新增、编辑、推进或结算按钮。
- 工作台最近工单卡已从临时 Snackbar 改为回传真实工单 ID；“工单”页卡片与工作台均 push 现有 `AppRoute.OrderDetail(orderId)`，详情始终从当前 `ordersState.allOrders` 查找。
- `AppNavDisplay` 和 `AutoserviceShell` 已接入真实列表/详情及搜索、筛选、清除、刷新回调；Navigation 3 继续为五个根标签维护独立栈，Android 契约覆盖从工单与工作台打开同一详情、切换标签保留详情以及返回各自根页。
- 认证后使用同一 `SessionViewModelStoreOwner` 创建 `OrdersViewModel`，与工作台共享既有 `OrdersRepository`；退出登录会清空会话级 ViewModelStore，未改 API、Room Schema、数据库版本或公司隔离逻辑。
- 详情与工作台入口契约先 RED 于详情组件/回调不存在，导航装配契约再 RED 于 `ordersState` 缺失；实现后聚焦 Navigation/ViewModel 测试和 Android 测试源码编译通过。完整 `:app:compileDebugAndroidTestKotlin :app:testDebugUnitTest :app:lintDebug :app:assembleDebug` 为 68 个 task、JVM 19 个 suite、91/91 通过、Lint 0 Fatal/0 Error/11 Warning，并生成 Debug APK。
- 已删除不再路由的工单阶段占位枚举与“工单列表正在升级”“详情将在后续阶段接入”文案；只读详情生产目录没有“新增工单”或“办理结算”。本阶段仍未启动模拟器、未执行连接式测试或原生视觉对比。
- Task 4 已继续完成，见下节。

#### 只读工单中心 Task 4：clean 验证与 APK 交付（已完成）

- 最终规格复核补齐了工单卡“预计交车”、详情顶部“只读”状态，以及分开的“接车日期/接车时间”；列表页头改为当前结果数，真空/无匹配文案严格收口为“暂无工单数据”“未找到匹配工单”。
- 2026-07-20 从 clean 状态执行 `clean :app:testDebugUnitTest :app:compileDebugAndroidTestKotlin :app:lintDebug :app:assembleDebug --rerun-tasks`，69 个 Gradle task 全部重新执行并 `BUILD SUCCESSFUL`。
- JVM XML 客观统计为 19 个 suite、91/91 测试、0 失败、0 错误、0 跳过；Android 测试 Kotlin 编译完成。Lint XML 为 0 Fatal、0 Error、11 Warning。
- `docs/android-client.md` 已增加真实列表顺序/状态、五字段搜索、固定筛选、未知状态、清除筛选、离线详情、陈旧重试、双入口独立返回栈、详情失效、无写入口、360dp/大字体/输入法/横向筛选和 48dp 控件真机清单。
- 最终 API 26+ Debug APK 已复制到 `E:\codex\chengxu\dist\releases\android\autoservice-android-debug-0.1.0.apk`，大小 19,475,098 字节，SHA-256 `6E33A6632A2BA35FA2D96F0F7E3D7263F6B7E1E3D881E9C5649B1E1F1938B77B`；发布副本与 clean 构建源哈希一致，`apksigner verify` 确认 v2 签名有效，签名者为 Android Debug。
- 本轮没有启动模拟器、没有执行连接式 Compose/Room 测试，也没有生成原生截图；列表密度、筛选滚动、输入法、详情返回、离线缓存和生产数据由用户安装该 APK 后在真实手机验收。
- 代码、文档与 APK 发布提交为 `1814cff`，已推送到 `origin/codex/android-mobile-ui-atlas`；发布后首次核对本地与远程完整哈希均为 `1814cff43f29028acf525028815528e53c5904b6`，实施计划四个 Task 全部完成。

### 下一里程碑：Android 完整业务能力（阶段 1 Inline Execution 执行中）

- 用户确认采用方案 A：Android 最终覆盖员工与管理员完整移动业务能力，按纵向业务切片分八阶段上线，不把所有高风险写入集中到一个版本。
- 继续复用现有 Cloudflare Functions、D1、腾讯云 COS、操作日志和网页端业务规则，不建设第二套移动后端。所有业务写入必须在线完成；离线只允许读取公司隔离缓存和编辑本地加密草稿，不建立离线写队列，也不恢复网络后自动提交。
- 员工可查看、新增、编辑未结算工单，并按 `在修中 -> 已完工 -> 待结算` 相邻向前推进；不可结算、返结算、作废、维护回执、导出或编辑已结算档案。管理员拥有员工能力，并可相邻调整普通状态、结算、返结算、作废、维护到账回执、修正历史非状态字段和导出。
- 保留“工作台 / 工单 / 新增 / 档案 / 我的”五栏。新增采用客户车辆、保险事故、维修费用、确认提交四步向导；档案覆盖维修历史、客户车辆和保险档案。
- 数据与 API 基线已锁定：拆分 `OrderSummary`、`OrderDetail`、`OrderDraft` 和命令结果；Room 存摘要、详情、加密草稿和同步游标；敏感字段使用 Android Keystore 支持的 AES-GCM 字段级加密；回执二进制和短期授权 URL 不持久化。
- 服务端增加版本号、`operationId` 幂等记录、乐观并发和语义化写入端点。冲突返回 409 并让用户比较最新数据与草稿，不能静默覆盖；结算通过 COS+D1 补偿保证失败不误标已结算；返结算保留回执与审计；作废保留追溯但不进入日常列表。
- 八阶段依次为：模型/存储/API 基础，新增工单，编辑/状态推进，档案中心，管理员结算，高风险管理，导出/账户/后台读取同步，正式发布。每阶段独立测试、文档、Git 提交、GitHub 推送和可安装 APK，并可通过能力开关回退到安全只读状态。
- 用户已批准完整主设计规格 `docs/superpowers/specs/2026-07-20-android-complete-business-capability-design.md`。阶段 1 任务级计划已生成：`docs/superpowers/plans/2026-07-20-android-stage-1-production-data-foundation.md`，严格限定为领域/权限/状态机、D1 版本与幂等基础、兼容读取 API、Android 扩展读取、通用 AES-GCM、Room v2、生产兼容接线和最终 APK 八个任务，不提前接入写入 UI。
- 阶段 1 计划包含生产 D1 备份、只应用 migration 0010、Pages Functions 部署和未认证 401 冒烟；每个任务独立 RED/GREEN、更新本文件、提交并推送，最后从 clean 状态完成 Node/Vite、Android JVM、Android 测试源码编译、Lint、APK 哈希和 v2 签名验证。
- 用户已选择 Inline Execution；当前会话使用 `executing-plans` 分批执行，不创建子代理或 worktree。执行前复核补齐增量同步删除语义：`updatedAfter`/delta cursor 查询公司全部变更，离开 current/history scope 或已作废的行通过 `removedOrderIds` tombstone 清理旧缓存，避免状态迁移后客户端残留重复工单。
- Task 1 首次 RED 被构建基线提前阻断：计划误用了外部 Gradle 8.10.2，而项目 AGP 8.13.2 和 `gradle-wrapper.properties` 明确要求 Gradle 8.13。已用仓库 `gradlew.bat --version` 验证本机缓存的 Gradle 8.13 可用，计划中的 Android 命令统一改用 wrapper；这不是依赖升级，后续重新运行真正的 RED。
- 后续仍按要求默认不启动 Android 模拟器，保留 JVM 单元测试、Android 测试代码编译、Lint、APK 构建和真机交接。

#### 阶段 1 Task 1：Android 完整领域、状态机与权限契约（已完成）

- 新增纯 Kotlin `OrderSummary`、`OrderDetail`、`OrderDraft`、`SettlementDraft`、`ReceiptMetadata`、`OrderPage`、`OrderCommandResult` 和 `BusinessCapability`；金额继续只使用 `Long` 分值，`OrderPage` 已包含增量同步所需的 `removedOrderIds`。
- 新增 `OrderStatus` wire 映射和 `allowedOrderTransition`：员工只允许 `在修中 -> 已完工 -> 待结算` 相邻向前，管理员额外允许普通状态相邻回退；普通状态机永远不能产生“已结算”。
- `AppPermission` 新增 `VIEW_RECORDS`、`MANAGE_RECORDS`、`EXPORT_DATA`。员工角色默认可查看档案但不能管理或导出；非管理员即使收到旧服务端 `voidOrder`/`export` key 也不会获得作废或导出能力，管理员仍拥有全部权限。
- TDD RED 先精确失败于新领域类型、状态机函数和权限枚举不存在；角色越权复核又先以 2 个断言失败证明旧 key 能提权，收紧映射后聚焦测试和 Android JVM 全量均 `BUILD SUCCESSFUL`。
- Android JVM XML 客观统计为 21 个 suite、97/97 测试、0 失败、0 错误、0 跳过。本任务未启动模拟器，下一步执行 Task 2：D1 版本、幂等记录与能力开关迁移。

## 工作纪律

每次重要改动后必须：

1. 提交 Git；
2. 推送 GitHub；
3. 更新本文件 `docs/latest-handoff-prompt.md`。

不要提交腾讯云 COS 密钥、账号密码或其他敏感信息。不要修改现有网页端布局来模拟移动端；Android 保持独立 `android-client/` 工程。继续采用测试驱动、任务级审查和小步提交。

如需使用本地隔离 worktree，请放在项目根目录 `.worktrees/`；该目录已被 Git 忽略，不能提交其中的构建产物或工作文件。
