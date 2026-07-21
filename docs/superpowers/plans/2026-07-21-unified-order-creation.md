# Unified Web and Android Order Creation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不削弱既有用户权限的前提下，为网页端和 Android 交付同一套可生产使用的新增工单能力，使编号、字典、默认值、校验、幂等、正式数据和权限完全以服务端为准。

**Architecture:** Cloudflare Pages Functions 与 D1 提供唯一创建服务、月度编号和幂等回执；网页与 Android 共享 JSON 契约 fixtures，分别实现平台适配的四步向导和加密本地草稿。旧 `POST /api/orders` 只把“新增”分支适配到新服务，既有工单更新路径留待下一阶段迁移。

**Tech Stack:** Cloudflare Pages Functions、D1、Node `node:test`、React 19、Vite 6、IndexedDB/Web Crypto、Kotlin 2.3.21、Java 17、Compose、Navigation 3、Room 2.8.4、Android Keystore AES-GCM、Gradle wrapper 8.13。

## Global Constraints

- 分支固定为 `codex/android-mobile-ui-atlas`；开始每个批次前确认工作树没有非本任务改动。
- 正式设计：`docs/superpowers/specs/2026-07-21-unified-order-creation-design.md`。
- 网页、Android 和兼容新增分支必须调用同一个服务规则，禁止复制编号、枚举、默认值或服务端校验。
- 服务端只信任 Bearer 会话中的 actor、role 与 company；忽略客户端系统字段。
- 正式金额在线路和 Android 领域层使用整数分；旧 decimal 只存在于兼容转换边界。
- 本阶段不实现编辑、状态推进、结算、回款、作废、回执维护或导出。
- 本地草稿不是正式业务数据；离线可以编辑已有草稿，但不能提交或进入离线写队列。
- 手机号、VIN 和草稿明文不得进入普通日志、Android 明文表或浏览器 `localStorage`。
- 每个任务必须 RED -> GREEN -> 回归；重要改动更新 `docs/latest-handoff-prompt.md`，提交 Git 并推送 GitHub。
- 不启动 Android 模拟器；执行 JVM 单元测试、Android 测试代码编译、Lint 和 APK 构建，连接式测试只保留源码。
- 执行 Wrangler、D1 或 Pages 命令前必须加载 Cloudflare Wrangler 技能并以当前官方文档复核命令。

## Shared Contract

Canonical fixture: `contracts/order-creation-v1.json`。

固定 wire 字段：

```text
operationId
order.customer / phone / plate / car / vin / staff
order.insuranceExpiry / insurer / type / accidentType / claimNo
order.record / laborCents / materialCents / delivery / remark
```

客户端不得发送 `id/companyId/role/status/version/date/time/settlement/receipt/voided` 作为创建依据。服务端响应必须包含标准 `OrderDetail`、`serverTime`、`capabilities` 和 operation 状态。

---

### Task 1: 共享契约 fixture 与 D1 阶段 2 迁移

**Files:**
- Create: `contracts/order-creation-v1.json`
- Create: `migrations/0011_unified_order_creation.sql`
- Create: `test/orderCreationMigration.test.mjs`
- Create: `test/orderCreationContract.test.mjs`
- Modify: `docs/latest-handoff-prompt.md`

- [x] **Step 1: 写 migration 与契约 RED 测试**

测试要求迁移具备：

- `order_number_sequences(month_key PRIMARY KEY, next_value, updated_at)`；
- `order_operations.lease_token` 与 `lease_until`；
- 月度序列与操作租约所需索引；
- 不在 migration 中直接为全部企业开启 `CREATE_ORDER`；
- fixture 含合法输入、字段错误、默认值、枚举和整数分示例，且不含客户端系统字段。

Run:

```powershell
node --test test/orderCreationMigration.test.mjs test/orderCreationContract.test.mjs
```

Expected: RED，文件或必需 SQL/fixture 字段不存在。

- [x] **Step 2: 实现只增量迁移和 canonical fixture**

迁移只新增表、列和索引，不删除现有列，不修改历史编号。租约列为已有 operation 行提供安全默认值。fixture 版本固定为 `1`，金额使用分。

- [x] **Step 3: GREEN 与本地 D1 migration 门禁**

```powershell
node --test test/orderCreationMigration.test.mjs test/orderCreationContract.test.mjs
npx.cmd wrangler d1 migrations apply chengxu-db --local
```

Expected: 聚焦测试通过，本地 migration 0011 成功且重复执行无待迁移。

- [x] **Step 4: 更新交接、提交和推送**

Commit: `feat(orders): add unified creation contract and migration`

---

### Task 2: 服务端创建元数据与纯业务规范化

**Files:**
- Create: `functions/_shared/order-creation.js`
- Create: `functions/api/order-creation-metadata.js`
- Create: `test/orderCreationLogic.test.mjs`
- Create: `test/orderCreationMetadata.test.mjs`
- Modify: `functions/_shared/order-foundation.js`
- Modify: `docs/latest-handoff-prompt.md`

- [x] **Step 1: 写纯规则与元数据 RED 测试**

覆盖：trim、必填错误 key、有效日期、非负整数分、长度上限、枚举成员、服务端默认值、未知字段忽略、固定状态与版本，以及员工/管理员和公司能力的交集。

```powershell
node --test test/orderCreationLogic.test.mjs test/orderCreationMetadata.test.mjs
```

- [x] **Step 2: 实现纯规范化边界**

`normalizeCreateOrderCommand(input, metadata)` 返回 `{ value, fieldErrors }`，不访问 D1；`buildCreationMetadata` 统一输出保险公司、车辆类型、事故类型、负责人、交付状态、默认值、长度和契约版本。所有稳定错误使用 code/key，不由客户端解析中文句子。

- [x] **Step 3: 实现认证元数据接口**

`GET /api/order-creation-metadata`：未认证 401；无 `CREATE_ORDER` 返回能力列表但 `canCreate=false`；有权限时返回公司隔离的负责人和统一字典。不得暴露其他企业账号或密码字段。

- [x] **Step 4: GREEN、全量 Node 回归、文档提交推送**

```powershell
node --test test/orderCreationLogic.test.mjs test/orderCreationMetadata.test.mjs
npm.cmd test
```

Commit: `feat(orders): add shared creation metadata and validation`

---

### Task 3: 幂等编号、统一创建 API 与旧新增兼容

**Files:**
- Create: `functions/api/orders/create.js`
- Create: `functions/api/order-operations/create-order/[operationId].js`
- Create: `test/orderCreationApi.test.mjs`
- Modify: `functions/_shared/order-creation.js`
- Modify: `functions/_shared/order-foundation.js`
- Modify: `functions/api/orders.js`
- Modify: `functions/_shared/order-audit.js`
- Modify: `docs/latest-handoff-prompt.md`

- [ ] **Step 1: 写 API RED 测试与 fake D1 场景**

覆盖：

- 未认证 401、能力关闭 403、跨企业字段被忽略；
- 北京时间月度 `ROYYYYMM#####` 编号与序列递增；
- 同 operation/同 hash 返回历史响应；
- 同 operation/不同 hash 返回 `OPERATION_ID_REUSED`；
- 有效租约返回 `OPERATION_IN_PROGRESS`；
- 超时接管复用 `target_id`，插入与完成回执同 batch；
- 网络未知后操作查询返回 completed；
- 旧 `POST /api/orders` 的缺失目标新增分支使用 `eventId` 并返回服务器 ID；
- 已存在目标继续走原更新路径；
- 一次创建只产生一次安全审计事件。

```powershell
node --test test/orderCreationApi.test.mjs
```

- [ ] **Step 2: 实现编号与租约 helper**

增加原子 `allocateOrderNumber`、操作认领/CAS 接管、`target_id` 预留和安全历史响应读取。协程/请求异常不能把 started 操作错误标成 completed；日志不得包含完整请求。

- [ ] **Step 3: 实现 `POST /api/orders/create` 与操作查询**

成功响应使用 201；历史成功重放保持原 http status 和 body；请求失败按设计错误码返回。工单插入与 operation completed 使用 D1 batch。日期时间和 `updated_at` 由同一北京时间/服务端时钟派生。

- [ ] **Step 4: 收紧旧新增分支**

网页新代码随后直接调用新接口。兼容分支只在目标不存在时把 `eventId` 映射到 operation；缺失 eventId 拒绝不安全新增；客户端 id/status/company 等不进入共享创建命令。现有工单更新测试必须保持通过。

- [ ] **Step 5: GREEN、全量 Node/Vite 门禁、文档提交推送**

```powershell
node --test test/orderCreationApi.test.mjs
npm.cmd test
npm.cmd run build
```

Commit: `feat(orders): add idempotent unified create service`

---

### Task 4: 网页创建 transport、状态机与加密草稿

**Files:**
- Create: `src/orderCreationLogic.js`
- Create: `src/orderCreationApi.js`
- Create: `src/orderCreationDraftStore.js`
- Create: `test/orderCreationWebLogic.test.mjs`
- Create: `test/orderCreationDraftStore.test.mjs`
- Modify: `src/App.jsx`
- Modify: `docs/latest-handoff-prompt.md`

- [ ] **Step 1: 写网页状态与 transport RED 测试**

覆盖四步 next/back、字段错误映射、decimal 输入到 cents 的精确转换、提交锁、UnknownResult 查询、成功只接受服务端详情，以及 canonical fixture 的 request body。

- [ ] **Step 2: 实现独立纯 reducer 与 API adapter**

创建动作改用 `/api/orders/create`，不再先生成本地正式 ID。API adapter 接收 `AbortSignal`，取消原样传播；401、403、409、字段错误、未知响应均映射为稳定结果。

- [ ] **Step 3: 写浏览器加密草稿 RED/GREEN**

IndexedDB 只保存 AES-GCM 密文、IV、版本和非敏感索引；Web Crypto key 不可导出。每个 actor+company 只保留一个新增草稿；登出、公司切换和成功提交清除。Node 无 Web Crypto/IndexedDB 能力部分使用依赖注入 fake，不新增第三方状态库。

- [ ] **Step 4: 全量 Node 回归、文档提交推送**

```powershell
node --test test/orderCreationWebLogic.test.mjs test/orderCreationDraftStore.test.mjs
npm.cmd test
```

Commit: `feat(web): add unified create state and encrypted drafts`

---

### Task 5: 网页四步新增工单界面与生产接线

**Files:**
- Create: `src/components/OrderCreationWizard.jsx`
- Create: `e2e/order-creation.spec.mjs`
- Create: `playwright.config.mjs`
- Modify: `src/App.jsx`
- Modify: `src/styles.css`
- Modify: `package.json`
- Modify: `docs/latest-handoff-prompt.md`

- [ ] **Step 1: 写浏览器 RED 用例**

覆盖四步字段顺序、默认/hover/pressed/focus/error/disabled、必填错误、草稿恢复/放弃、离开确认、离线提交禁用、权限禁用、单次提交和成功进入服务端返回详情。

- [ ] **Step 2: 实现响应式四步向导**

复用现有网页视觉令牌和 Hugeicons，不增加第二套图标。桌面与窄屏均使用同一业务组件；底部操作区固定，内容独立滚动，键盘可达且焦点在步骤/错误间正确移动。

- [ ] **Step 3: 替换网页旧创建入口**

所有网页“新增工单”入口进入同一 wizard。旧 `createOrderDraft()` 仅保留编辑路径需要的部分，新增路径不得生成 `RO202607...` 本地 ID。创建成功以服务端 order 替换状态并刷新列表/详情。

- [ ] **Step 4: Web GREEN 与构建**

```powershell
npm.cmd test
npm.cmd run test:web-ui
npm.cmd run build
```

Commit: `feat(web): ship unified four-step order creation`

---

### Task 6: Android 创建模型、共享契约与 HTTP API

**Files:**
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/orders/OrderCreateApi.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/orders/HttpUrlConnectionOrderCreateApi.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/orders/model/OrderCreationModels.kt`
- Create: `android-client/app/src/test/java/com/chengxu/autoservice/core/orders/HttpUrlConnectionOrderCreateApiTest.kt`
- Create: `android-client/app/src/test/java/com/chengxu/autoservice/core/orders/model/OrderCreationContractTest.kt`
- Modify: `android-client/app/build.gradle.kts`
- Modify: `docs/latest-handoff-prompt.md`

- [ ] **Step 1: 配置 canonical fixture 为 JVM test resource 并写 RED**

`sourceSets.test.resources` 引用仓库 `contracts/`，测试同一 fixture 的字段、枚举、金额和禁传系统字段；不得复制另一份 fixture。

- [ ] **Step 2: 定义创建领域和失败类型**

模型包含 metadata、表单值、field errors、operation state 和 `OrderCommandResult<OrderDetail>`；表单金额解析只在纯 Kotlin 边界发生，溢出或三位小数返回字段错误。

- [ ] **Step 3: 实现 metadata/create/operation-query transport**

复用现有 Bearer 与 `OrdersHttpTransport` 风格；严格要求成功详情核心字段，未知字段忽略；IOException 映射网络不可用，401/403/409/400 精确映射，CancellationException 原样传播。

- [ ] **Step 4: Android JVM GREEN、文档提交推送**

```powershell
$env:JAVA_HOME='E:\codex\APP\.android-build\jdk\jdk-17.0.19+10'
$env:ANDROID_HOME='E:\codex\APP\.android-build\android-sdk'
.\gradlew.bat :app:testDebugUnitTest --tests "*OrderCreationContractTest" --tests "*HttpUrlConnectionOrderCreateApiTest"
```

Commit: `feat(android): add unified order creation API contract`

---

### Task 7: Android 创建仓库与加密单草稿

**Files:**
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/core/orders/OrderCreationRepository.kt`
- Create: `android-client/app/src/test/java/com/chengxu/autoservice/core/orders/OrderCreationRepositoryTest.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/core/orders/cache/FoundationDao.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/core/orders/cache/EncryptedOrderStore.kt`
- Modify: `android-client/app/src/androidTest/java/com/chengxu/autoservice/core/orders/cache/FoundationDaoTest.kt`
- Modify: `docs/latest-handoff-prompt.md`

- [ ] **Step 1: 写仓库与 DAO RED 测试**

覆盖每公司仅最新一个创建草稿、损坏密文删除、保存/恢复/放弃、离线拒绝提交、能力拒绝、成功写详情与摘要后删草稿、未知结果查询以及 401 触发会话失效。

- [ ] **Step 2: 扩展加密草稿存储**

增加 `getLatestCreateDraft`、`observeCreateDraft`、`replaceCreateDraft`、`deleteCreateDraft`，全部 company 隔离。保存新草稿时事务删除同企业旧新增草稿，但不删除未来编辑草稿。

- [ ] **Step 3: 实现创建仓库编排**

仓库是网络、session/network monitor、EncryptedOrderStore、Room summary/detail 写入和 session invalidator 的唯一协调点；UI 不直接调用 DAO 或 HTTP。

- [ ] **Step 4: JVM GREEN 与 Android 测试源码编译**

```powershell
.\gradlew.bat :app:testDebugUnitTest --tests "*OrderCreationRepositoryTest"
.\gradlew.bat :app:compileDebugAndroidTestKotlin
```

不启动模拟器，不声称 DAO 连接式用例已运行。

Commit: `feat(android): add encrypted creation draft repository`

---

### Task 8: Android 四步 Compose UI、权限与 Navigation 3 接线

**Files:**
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/ui/create/CreateOrderViewModel.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/ui/create/CreateOrderModels.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/ui/create/CreateOrderScreen.kt`
- Create: `android-client/app/src/main/java/com/chengxu/autoservice/ui/create/CreateOrderComponents.kt`
- Create: `android-client/app/src/test/java/com/chengxu/autoservice/ui/create/CreateOrderViewModelTest.kt`
- Create: `android-client/app/src/androidTest/java/com/chengxu/autoservice/CreateOrderScreenTest.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/MainActivity.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/AutoserviceApp.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/ui/shell/AutoserviceShell.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/navigation/AppNavDisplay.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/navigation/AppNavigationState.kt`
- Modify: `android-client/app/src/main/java/com/chengxu/autoservice/core/designsystem/BrandIcon.kt`
- Modify: `docs/latest-handoff-prompt.md`

- [ ] **Step 1: 写 ViewModel RED**

覆盖 metadata loading、四步校验、金额转换、debounced/立即草稿保存、恢复/放弃、离开确认、offline/capability disabled、submit lock、UnknownResult 和成功事件仅消费一次。

- [ ] **Step 2: 写 Compose/导航测试源码**

覆盖步骤和字段顺序、48dp 操作、错误语义、禁用状态、保存/放弃 dialog、软键盘滚动语义、工作台与中间 tab 同入口、创建成功切换 Orders 并 push `OrderDetail(serverId)`。

- [ ] **Step 3: 实现品牌化原生 UI**

复用现有 tokens、Brand controls 和已转换 Hugeicons vector；缺图标只从 Hugeicons 补充，不使用 Emoji 或其他图标库。移动端覆盖 default/focus/pressed/error/loading/disabled，不伪造 hover。

- [ ] **Step 4: 完成 DI 与 Navigation 3 接线**

`MainActivity` 创建单一 repository；authenticated session 范围持有 `CreateOrderViewModel`；`StageScreen(CREATE)` 被正式 screen 替换。成功后 Room 先更新，再 `navigationState.openOrderDetail(orderId)` 切换工单栈。

- [ ] **Step 5: JVM、Android test compile 与 Lint GREEN**

```powershell
.\gradlew.bat :app:testDebugUnitTest --tests "*CreateOrderViewModelTest" --tests "*AppNavigationStateTest"
.\gradlew.bat :app:compileDebugAndroidTestKotlin :app:lintDebug
```

Commit: `feat(android): ship four-step order creation flow`

---

### Task 9: 双端契约回归与 clean 本地发布门禁

**Files:**
- Modify: `test/orderCreationContract.test.mjs`
- Modify: `android-client/app/src/test/java/com/chengxu/autoservice/core/orders/model/OrderCreationContractTest.kt`
- Modify: `docs/android-client.md`
- Modify: `docs/latest-handoff-prompt.md`

- [ ] **Step 1: 补齐跨端 fixture 断言**

同一 fixture 必须验证 web request、Android request、服务端 normalize 结果、字段错误 key、金额和默认值完全一致。增加防回归断言：网页不得出现硬编码 `RO202607`，Android 不得包含第二套业务枚举文案。

- [ ] **Step 2: 从 clean 状态执行完整本地门禁**

根目录：

```powershell
npm.cmd test
npm.cmd run test:web-ui
npm.cmd run build
git -c safe.directory=E:/codex/chengxu diff --check
```

Android 目录：

```powershell
.\gradlew.bat clean :app:testDebugUnitTest :app:compileDebugAndroidTestKotlin :app:lintDebug :app:assembleDebug --rerun-tasks
```

记录客观 suite/test/task 数量、Lint fatal/error/warning，不启动模拟器。

- [ ] **Step 3: 更新真机清单、提交和推送**

真机清单至少覆盖：登录、权限显示、四步输入、后台恢复、断网草稿、提交断网未知结果、重复点击、成功列表/详情同步、网页同时查看、登出清理。

Commit: `test(orders): verify unified creation across clients`

---

### Task 10: 远端 D1、Pages、能力开关与 APK 交付

**Files:**
- Modify: `docs/android-client.md`
- Modify: `docs/latest-handoff-prompt.md`
- Update artifact: `dist/releases/android/autoservice-android-debug-0.1.0.apk`

- [ ] **Step 1: 复核 Wrangler 技能、登录和待迁移清单**

确认目标 account、`chengxu-db`、Pages project `chengxu`，且唯一待迁移文件为 0011。任何不符立即停止远端写入。

- [ ] **Step 2: 远端备份与 migration**

```powershell
npx.cmd wrangler d1 export chengxu-db --remote --output tmp/d1-backups/pre-android-stage-2.sql
npx.cmd wrangler d1 migrations apply chengxu-db --remote
```

记录备份 byte 与 SHA-256；只读确认序列表、operation 租约列和无待迁移。备份保留到真机验收完成。

- [ ] **Step 3: 部署 Pages 并执行安全冒烟**

```powershell
npm.cmd run build
npx.cmd wrangler pages deploy dist --project-name chengxu
```

验证生产域名 metadata/create/operation-query 未认证均为 401；使用不含敏感信息的授权方式验证公司隔离、能力关闭 403 和测试创建/回读。不得在命令历史、文档或日志写入密码/Token。

- [ ] **Step 4: 启用目标企业 `CREATE_ORDER` 并验证**

在接口与网页已部署且门禁通过后，使用受控 D1 命令为目标企业 upsert `CREATE_ORDER=1`。只读查询确认，不开启其他阶段能力。若冒烟失败立即设回 0。

- [ ] **Step 5: 生成、验证并复制 APK**

```powershell
.\gradlew.bat :app:assembleDebug
```

复制到 `dist/releases/android/autoservice-android-debug-0.1.0.apk`，核对源/副本 SHA-256，执行 `apksigner verify --verbose` 并记录 v2 签名结果。

- [ ] **Step 6: 最终交接、提交和推送**

交接记录：生产 deployment URL、migration、能力状态、全量测试统计、APK 绝对路径/bytes/SHA-256、未启动模拟器和待用户真机验证项。

Commit: `release(android): deliver unified order creation apk`

## Final Definition of Done

- 10 个任务全部完成并逐项勾选；
- 所有重要提交均已推送 `origin/codex/android-mobile-ui-atlas`；
- 网页、Android 与兼容新增使用同一服务规则和 canonical fixture；
- 正式工单号只由服务端生成，幂等重试无重复工单；
- 正式工单在双端列表/详情一致，草稿明确本地未同步；
- 权限能力未减少，系统字段不能被客户端伪造；
- 远端可通过 `CREATE_ORDER` 单独回退；
- 可安装 APK 已生成并完成哈希/签名校验；
- 没有启动模拟器，也没有声称连接式 Android 测试已执行。
