# 阶段 3：Web 与 Android 统一订单编辑和普通状态流转设计

## 1. 背景与已确认决策

阶段 1 已建立公司隔离读取、版本号、幂等操作表、企业能力开关、Android Room v2 与敏感字段加密；阶段 2 已让网页端和 Android 统一使用服务端新增工单命令。下一纵向业务切片是编辑未结算工单，以及在普通维修状态间推进或回退。

本阶段采用一个统一设计、分两个功能批次交付：先完成编辑，再完成普通状态流转，最后统一部署网页、启用企业能力并生成 Android APK。网页端与 Android 必须共享同一服务端规则、契约、权限、版本冲突和幂等语义，不能维护两套业务事实。

已确认的产品边界如下：

- 新增认证 `PATCH /api/orders/:id`，只修改普通业务字段。
- 新增认证 `POST /api/orders/:id/status`，只执行普通状态变更。
- 两个命令都要求客户端提供 `operationId` 与 `expectedVersion`。
- 编辑只允许未结算、未作废工单；状态不能通过编辑接口修改。
- 员工只能相邻向前：`在修中 -> 已完工 -> 待结算`。
- 管理员可在三个普通状态间相邻向前或向后；不能通过普通状态接口结算。
- `EDIT_ORDER` 与 `ADVANCE_ORDER_STATUS` 是互相独立的企业能力开关。
- 冲突不静默覆盖、不自动重放；结果未知时只查询原 `operationId`。
- 本阶段不实现结算、返结算、作废、已结算历史修正或到账回执。
- 本阶段不新增 D1 migration，也不升级 Android Room schema。

## 2. 目标

- 网页端与 Android 使用相同的 16 个可编辑字段、字典、金额单位、校验和错误 key。
- 同一工单被多个客户端修改时，通过 `expectedVersion` 阻止丢失更新。
- 重复点击、超时重试或进程恢复不产生重复业务修改和重复审计。
- Android 与网页端都能离线编辑并加密保存草稿，但离线不能提交，也不能恢复网络后自动提交。
- 状态流转始终要求在线和显式确认，不建立离线状态草稿。
- 服务端继续强制验证会话企业、角色、权限、企业能力、工单状态和版本。
- 每个批次完成测试、交接文档、Git 提交和 GitHub 推送；最终交付可安装 APK。

## 3. 非目标

- 不允许编辑工单 ID、企业、创建日期/时间、当前状态、版本、结算字段、回执字段或作废字段。
- 不把普通状态接口扩展为结算接口，也不允许目标状态为 `已结算`。
- 不实现字段级自动合并、最后写入者获胜或后台自动重试。
- 不实现离线写队列、系统后台自动提交或网络恢复后静默提交。
- 不在生产企业数据上自动执行真实编辑或状态写入。
- 不为本阶段修改 Android 数据库版本；现有 `order_drafts` 表和加密存储边界足够使用。
- 不重做已确认的品牌 UI；新增界面继续复用现有四步向导、详情页、对话框和 Navigation 3 壳层。

## 4. 权限、能力与状态规则

### 4.1 服务端授权顺序

所有命令先验证 Bearer 会话，再以会话中的 `company_id` 查询工单。客户端传入的企业、角色或权限字段一律忽略。跨企业、已作废或不存在的目标统一返回 404，避免泄露其他企业数据。

编辑要求：

- 企业已启用 `EDIT_ORDER`；
- 管理员，或拥有 `repair` 权限的员工；
- 工单状态属于 `在修中`、`已完工`、`待结算`；
- 工单未作废且版本等于 `expectedVersion`。

普通状态流转要求：

- 企业已启用 `ADVANCE_ORDER_STATUS`；
- 管理员，或拥有 `repair` 权限的员工；
- 当前状态和目标状态都属于 `在修中`、`已完工`、`待结算`；
- 命中角色允许的相邻边；
- 工单未作废且版本等于 `expectedVersion`。

### 4.2 状态矩阵

| 当前状态 | 目标状态 | 员工 | 管理员 |
| --- | --- | --- | --- |
| 在修中 | 已完工 | 允许 | 允许 |
| 已完工 | 待结算 | 允许 | 允许 |
| 已完工 | 在修中 | 禁止 | 允许 |
| 待结算 | 已完工 | 禁止 | 允许 |
| 任意普通状态 | 跳过相邻状态 | 禁止 | 禁止 |
| 任意普通状态 | 已结算 | 禁止 | 禁止 |
| 已结算或已作废 | 任意普通状态 | 禁止 | 禁止 |

员工在 `待结算` 详情中不显示普通状态按钮。管理员只显示当前状态可到达的相邻动作。客户端可据此隐藏动作，但服务端仍必须独立执行相同矩阵验证。

## 5. 共享编辑契约

### 5.1 完整快照语义

`PATCH /api/orders/:id` 的 `order` 是 16 个客户端可写字段组成的完整编辑快照，而不是 JSON Merge Patch。网页端和 Android 都从服务端最新详情或已保存草稿构造完整快照，确保请求哈希、差异展示和跨端行为稳定。

可写字段精确为：

1. `customer`
2. `phone`
3. `plate`
4. `car`
5. `vin`
6. `staff`
7. `insuranceExpiry`
8. `insurer`
9. `type`
10. `accidentType`
11. `claimNo`
12. `record`
13. `laborCents`
14. `materialCents`
15. `delivery`
16. `remark`

`amountCents` 由服务端使用 `laborCents + materialCents` 计算。编辑复用阶段 2 的必填字段、长度、日期、选项和非负安全整数分校验。字典继续读取 `GET /api/order-creation-metadata` 的同一 canonical metadata；接口名暂不改变，以免制造第二份字典协议。

请求示例：

```json
{
  "operationId": "8b3ea52d-0c84-48fb-83a4-0d762f495224",
  "expectedVersion": 3,
  "order": {
    "customer": "张先生",
    "phone": "13800000000",
    "plate": "鄂K12345",
    "car": "示例车型",
    "vin": "",
    "staff": "王师傅",
    "insuranceExpiry": "2027-07-22",
    "insurer": "人保财险",
    "type": "标的车",
    "accidentType": "喷漆维修（无换件）",
    "claimNo": "",
    "record": "前保险杠喷漆",
    "laborCents": 30000,
    "materialCents": 12000,
    "delivery": "明日交车",
    "remark": ""
  }
}
```

禁止字段即使出现在请求中也不能覆盖服务端值；测试必须覆盖 `id`、`companyId`、`role`、`status`、`version`、日期时间、结算、回执和作废字段均无效。

### 5.2 共享 fixture

新增独立版本化 fixture，例如 `contracts/order-edit-v1.json`，包含：

- 16 个允许字段及禁止字段列表；
- 必填项、最大长度、日期和枚举规则；
- 合法完整快照与 canonical 结果；
- 缺失、超长、非法日期、非法选项、非法金额用例；
- 服务器当前值与本地草稿的差异期望。

Node、网页逻辑和 Android JVM 测试读取同一 fixture，不复制事故类型、必填字段或错误 key。

## 6. API 与结果模型

### 6.1 编辑命令

`PATCH /api/orders/:id`

- 成功：200，返回最新 `OrderDetail`、`serverTime`、能力集合和已完成 operation。
- 校验失败：400 `VALIDATION_FAILED`，携带稳定 `fieldErrors`。
- 企业能力关闭：403 `CAPABILITY_DISABLED`。
- 目标不可见：404 `ORDER_NOT_FOUND`。
- 已结算或其他不可编辑状态：409 `ORDER_NOT_EDITABLE`，携带最新安全详情。
- 版本不一致：409 `ORDER_VERSION_CONFLICT`，携带最新安全详情和 `conflictingFields`。

`conflictingFields` 是服务器最新详情与本次完整编辑快照之间值不同的可写字段列表。客户端保留本地起始快照，因此界面可以同时展示起始值、服务器值和本地草稿；服务端不声称维护字段历史。

### 6.2 普通状态命令

`POST /api/orders/:id/status`

请求体只接受：

```json
{
  "operationId": "da997031-0f46-4728-b369-423b63b0a79d",
  "expectedVersion": 4,
  "targetStatus": "待结算"
}
```

- 成功：200，返回最新 `OrderDetail`、`serverTime`、能力集合和已完成 operation。
- operation、version 或目标格式非法：400。
- 企业能力关闭或角色不允许该方向：403。
- 目标不可见：404。
- 当前状态、相邻边或版本已变化：409，返回 `ORDER_STATUS_CONFLICT` 或 `ORDER_VERSION_CONFLICT` 以及最新安全详情。

### 6.3 幂等结果查询

新增：

- `GET /api/order-operations/edit-order/:operationId`
- `GET /api/order-operations/change-order-status/:operationId`

查询继续按 `company + actor + action + operationId` 隔离。完成时重放原 HTTP 状态和响应；处理中返回 `pending`；无法找到返回 404。一个 operation ID 只能绑定一个 canonical 请求哈希，复用到不同请求返回 409 `OPERATION_ID_REUSED`。

网络异常、5xx 或畸形响应发生在请求发出后时，客户端必须进入“结果待确认”，保留同一个 operation ID，并先查询结果。只有明确收到未执行结果且用户再次确认后，才能生成新 operation；不能因超时直接创建另一写请求。

## 7. 服务端一致性与审计

### 7.1 乐观锁

成功更新必须包含：

```sql
WHERE company_id = ? AND id = ? AND version = ?
```

并同时限制未作废与允许状态。成功后 `version = version + 1`，`updated_at` 使用服务端时间。任何客户端都不能指定新版本或更新时间。

### 7.2 操作租约

编辑动作名固定为 `edit_order`，普通状态动作名固定为 `change_order_status`。两者复用阶段 2 已有 `order_operations` 短租约、请求哈希、结果存储和超时接管机制，无需新表或新列。

### 7.3 D1 原子批次

成功命令使用同一 D1 batch，按以下依赖顺序执行：

1. 在 operation 租约、目标工单版本和状态前置条件满足时，以 `operationId` 为唯一 `event_id` 条件插入审计哨兵；
2. 在相同租约、版本和状态条件下更新工单；
3. 仅在审计哨兵存在时把 operation 标记为 completed 并保存预计算响应。

D1 batch 提供事务性和顺序执行。若前置条件未命中，审计、更新和完成记录都不应成功；服务读取最新详情后把冲突结果稳定写入 operation。这样每次成功业务写入恰好一个审计事件，幂等重放不重复写入；也避免“工单未更新但 operation 被误标成功”。实现测试必须断言三个语句的 `changes`，不能只信任 HTTP 路径已执行。

编辑审计 action 为 `update_order`，changes 只包含实际变化字段，不记录手机号、VIN 等敏感明文到摘要；状态审计 action 为 `change_order_status`，记录当前状态、目标状态、角色、目标工单与 operation ID。没有字段或状态实际变化的请求不能产生虚假成功审计。

## 8. 网页端体验

### 8.1 编辑入口与四步向导

详情页仅在在线/离线均可读且当前工单可编辑、会话拥有 `EDIT_ORDER` 时展示“编辑工单”。能力关闭时不提供可点击入口；离线时允许进入编辑和保存本地草稿，但提交按钮禁用并明确显示只读原因。

编辑复用阶段 2 四步向导、字段控件、48px 触控目标、键盘/焦点/错误/禁用状态和 canonical metadata。标题、主动作和离开文案切换为编辑语义。进入时：

- 若无草稿，以当前最新详情建立 `baseSnapshot` 和 `expectedVersion`；
- 若有同工单草稿，提示继续或放弃；
- 草稿与当前服务器版本不同，不直接提交，先进入冲突检查。

IndexedDB 草稿按 `actor + company + orderId` 隔离，每个工单最多一份编辑草稿，允许同时保存多个工单。载荷继续 AES-GCM 加密；手机号、VIN 和表单明文不得写入 localStorage、日志或错误遥测。

保存成功后删除该工单编辑草稿，以服务器详情更新列表、详情和工作台派生数据，并留在该工单详情页。

### 8.2 编辑冲突

409 时展示服务器最新值与本地草稿差异，不静默覆盖。用户只有两个明确选择：

- “返回详情”：放弃本次冲突草稿并展示服务器最新详情；
- “基于最新版本继续编辑”：先查看差异，再保留本地 16 字段值，将新的服务器详情作为起始快照并把 `expectedVersion` 更新为最新版本。

第二个选择只是重建可编辑草稿，不自动提交，也不复用已完成或冲突的 operation ID。用户再次点击提交时生成新 operation 并重新确认。

### 8.3 状态确认

网页端使用确认模态框，显示工单号、车牌、当前状态、目标状态和影响说明。确认按钮具备默认、hover、pressed、focus 和 disabled 状态；请求期间锁定，防止双击。

成功后用服务端详情更新所有本地视图。冲突时展示服务器最新状态，关闭旧确认并让用户重新选择；不能自动把旧目标应用到新版本。

## 9. Android 体验与本地持久化

### 9.1 编辑流程

详情页根据网络、状态、角色和 `EDIT_ORDER` 展示编辑入口。Android 复用现有 `CreateOrderScreen` 的四步表单组件与视觉规范，但使用独立 `EditOrderViewModel`、路由状态和仓库，避免新增草稿与编辑草稿互相覆盖。

现有 Room v2 `order_drafts` 已有：

- `companyId`
- `localId`
- `baseOrderId`
- `expectedVersion`
- `encryptedPayload`
- `updatedAtMillis`

编辑草稿使用稳定的工单级 local ID，并设置 `baseOrderId = orderId`。DAO 增加按 `companyId + baseOrderId` 查询、观察、替换和删除的方法；创建草稿仍严格使用 `baseOrderId IS NULL`，两者互不删除。现有 `EncryptedOrderStore` 继续负责加解密，Room 不保存表单明文。

离线允许打开、继续编辑和保存草稿，提交保持禁用。进入后台、返回手势和离开确认都先保存最新 dirty 状态。编辑成功后，仓库先原子更新详情/摘要并删除编辑草稿，ViewModel 再导航回同一详情。

### 9.2 状态流程

Android 使用全屏确认页而不是临时底部提示，以便在手机上清晰展示工单号、车牌、当前/目标状态、影响和错误恢复。页面只提供取消和确认两个主动作，请求中锁定确认。

状态操作不允许离线创建普通草稿。只有请求发出后结果未知时，才把待确认信封加密保存在现有 `order_drafts` 表中。信封使用与编辑草稿不同的 local ID namespace，包含：

- order ID；
- 原 operation ID；
- expected version；
- target status；
- pending/confirming 状态；
- 创建时间。

`baseOrderId` 仍指向目标工单，`expectedVersion` 使用表列，其他内容位于 `encryptedPayload`。应用启动、会话恢复或重新进入该详情时先查询原 operation 结果；不生成新 operation。完成后更新 Room 摘要/详情并删除信封；明确失败或冲突时删除信封、展示最新详情并要求用户重新选择。

编辑草稿和状态待确认信封使用不同 local ID namespace，DAO 的“每工单一份编辑草稿”替换操作不得删除状态信封。退出、会话失效或企业切换继续沿现有认证清理器删除该企业敏感载荷。

### 9.3 缓存一致性

编辑或状态成功后必须使用服务端返回的完整详情：

1. 更新加密 `order_details`；
2. 更新 `order_summaries`；
3. 让当前列表、工单详情和工作台观察流自然刷新；
4. 若工单仍处于普通状态，保持在 current scope；本阶段不会产生 history scope。

不得先乐观修改 UI 再等待服务端；提交期间可显示预期动作，但正式状态与版本只取服务端响应。

## 10. 错误与恢复矩阵

| 场景 | 客户端行为 |
| --- | --- |
| 离线进入编辑 | 可编辑和加密保存，提交禁用 |
| 离线触发状态 | 不创建请求或草稿，显示需联网 |
| 400 字段错误 | 映射到编辑步骤和字段，保留草稿 |
| 401 | 触发现有会话失效和敏感缓存清理 |
| 403 能力关闭 | 刷新能力，关闭写入口，保留编辑草稿 |
| 403 状态方向不允许 | 关闭确认，展示权限原因和最新详情 |
| 404 | 从当前缓存移除不可见目标并返回列表 |
| 409 编辑版本冲突 | 展示服务器/本地差异，用户放弃或显式 rebase |
| 409 状态冲突 | 展示最新状态，用户重新选择，不自动重放 |
| 409 operation 处理中 | 保留原 ID，进入结果查询 |
| 请求后网络异常、5xx、畸形响应 | 保留原 ID，标记结果未知并查询 |
| 查询仍 pending | 保持待确认，不生成新写入 |
| 查询 completed | 应用原结果、更新缓存并清理草稿/信封 |

## 11. 测试策略

### 11.1 服务端与共享契约

- fixture 驱动 16 字段 canonical、默认值、整数分和字段错误。
- 未认证、过期会话、跨企业、能力关闭、员工无 repair、管理员矩阵。
- 已结算、已作废、非法目标、跳级、员工回退。
- 正常编辑/状态成功后 version 精确加一，金额由分值计算。
- 版本冲突返回最新详情与稳定差异，不覆盖数据。
- 同 operation + 同 hash 重放原结果；同 ID + 不同 hash 拒绝。
- 有效租约 pending、过期租约接管、结果查询 actor/company/action 隔离。
- D1 batch 前置条件未命中时工单、成功 operation 和审计均不写入。
- 成功或幂等重放只有一个 operation 与一个 audit event。
- 旧 `POST /api/orders` 的既有编辑分支改为调用同一编辑服务，不能绕过版本、能力或状态规则。

### 11.2 网页端

- 编辑入口权限、在线/离线、已结算和已作废可见性。
- 四步恢复、字段校验、金额、保存/放弃、遮罩/Escape/关闭确认。
- 每工单草稿隔离、不同 actor/company 隔离、密文损坏清理、登出清理。
- 编辑成功刷新详情和列表，草稿删除。
- 版本冲突差异、返回详情、显式 rebase 后再次提交。
- 状态矩阵、确认信息、双击锁、冲突后不自动重放。
- 网络/5xx/畸形响应使用同 operation ID 查询并恢复。

Playwright 至少新增编辑草稿/离线、编辑冲突、状态双击与未知结果恢复路径，并保留阶段 2 新增工单用例。

### 11.3 Android

- shared fixture contract、API JSON、HTTP 状态映射和 UTF-8 路径。
- repository 的会话、企业、在线、能力、版本和结果未知门禁。
- DAO 的创建草稿、每工单编辑草稿和状态信封 namespace 互不删除。
- 加密载荷损坏删除、协程取消传播、退出/换公司清理。
- `EditOrderViewModel` 的四步校验、自动保存、离线禁交、字段错误、冲突和显式 rebase。
- 状态 ViewModel 的角色矩阵、全屏确认、提交锁、冲突和进程恢复。
- 成功详情/摘要更新与 Navigation 3 返回行为。

保留 JVM 单元测试、Android 测试源码编译、Lint 和 APK 构建；按用户要求不启动 Android 模拟器，也不声称连接式 Compose、Room 或 AndroidKeyStore 测试已运行。

## 12. 分批交付与发布

### 批次 A：统一编辑基础

- 新增编辑 fixture、共享 normalize/diff、服务端编辑命令和 operation 查询。
- 旧网页编辑数据通路调用同一服务，不再保留绕过能力和版本的第二套更新逻辑。
- 完成 Node 测试和构建，更新交接，提交并推送。

### 批次 B：双端编辑体验

- 完成网页四步编辑、IndexedDB 加密编辑草稿和冲突界面。
- 完成 Android 编辑 API、仓库、Room 草稿方法、ViewModel 和 Compose 页面。
- 完成双端测试门禁，更新交接，提交并推送。
- 生产 `EDIT_ORDER` 仍保持关闭，直到最终发布检查。

### 批次 C：普通状态流转

- 新增共享状态矩阵、服务端状态命令和 operation 查询。
- 完成网页确认模态框与 Android 全屏确认/待确认恢复。
- 完成状态、并发、幂等、审计和双端交互测试。
- 更新交接，提交并推送。

### 批次 D：生产部署与 APK

1. 完整导出远端 D1 备份并记录大小与 SHA-256；即使没有 migration，也保留写能力上线前快照。
2. 运行 Node 全量测试、Playwright、Vite 生产构建。
3. 运行 Android JVM 全量、Android 测试源码编译、Lint 和 APK 构建，不启动模拟器。
4. 部署 Pages，先验证未认证、认证读取、能力关闭、非法请求、公司隔离和业务计数不变。
5. 先为目标企业启用 `EDIT_ORDER`，完成无真实业务写入的门禁复查。
6. 再独立启用 `ADVANCE_ORDER_STATUS`，完成相同复查；两个开关可分别回滚。
7. 构建并归档可安装 APK，记录绝对路径、字节数、SHA-256 和 v2 签名验证。
8. 更新 `docs/android-client.md` 与 `docs/latest-handoff-prompt.md`，提交并推送。

生产自动冒烟不创建、编辑或推进真实工单。由于没有专用生产测试企业，真实写入闭环由用户使用最终 APK 和网页端在授权业务数据上手工验收。

## 13. 验收标准

- Web 与 Android 编辑相同字段得到相同 canonical 请求、校验结果、金额和服务端详情。
- 员工和管理员的普通状态动作严格符合矩阵，无法跳级、越权或产生已结算状态。
- 并发编辑或状态变更返回可理解的最新详情，绝不静默覆盖。
- 重复点击、重试和未知结果恢复不重复修改、不重复审计。
- 离线编辑草稿加密保存且不自动提交；离线状态动作不产生待执行写入。
- 创建草稿、不同工单编辑草稿和状态待确认信封互不覆盖。
- 服务端每次成功写入 version 精确加一，网页和 Android 都以响应更新详情、列表与工作台。
- 企业能力可独立启停；关闭任一能力不会影响查看和新增工单。
- 全量自动门禁通过并生成已验证签名的 APK；连接式 Android 场景明确交由真机验收。
