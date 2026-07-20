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
- 下一步由用户选择计划执行方式，再逐任务实施；每个任务都必须更新本交接文档、提交并推送。

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
- 下一步执行 HTML 品牌原型 Task 5：完成员工/管理员双角色工作台及原型角色切换。

## 工作纪律

每次重要改动后必须：

1. 提交 Git；
2. 推送 GitHub；
3. 更新本文件 `docs/latest-handoff-prompt.md`。

不要提交腾讯云 COS 密钥、账号密码或其他敏感信息。不要修改现有网页端布局来模拟移动端；Android 保持独立 `android-client/` 工程。继续采用测试驱动、任务级审查和小步提交。

如需使用本地隔离 worktree，请放在项目根目录 `.worktrees/`；该目录已被 Git 忽略，不能提交其中的构建产物或工作文件。
