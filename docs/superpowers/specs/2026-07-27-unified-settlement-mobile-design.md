# Android 结算、返结算与日期输入跨端一致化设计

## 目标

将 Android 工单的结算、返结算和到账回执能力与网页端对齐，并消除业务日期必须手工输入的操作成本。该功能包同时修正工单详情标题栏“编辑”动作与整体移动端视觉语言割裂的问题。

## 范围

### 结算与返结算

- `SETTLE_ORDER` 和 `MAINTAIN_RECEIPT` 同时可用的管理员，才能对状态为“待结算”、未作废的工单发起结算。
- 结算表单显示工单号、车牌、客户和应结金额；可选择付款方式（现金、微信、支付宝、保险直赔、挂账）、结算日期、结算时间和结算备注。
- 结算必须有到账回执截图。Android 只使用系统相册/图片选择器，不申请相机权限；仅接受 JPEG、PNG 和 WebP，最大 12 MiB，与 `functions/api/receipts.js` 保持一致。
- `REVERSE_SETTLEMENT` 可用的管理员，才能对已结算、未作废工单执行二次确认的返结算。成功后工单回到“待结算”，重新出现在当前工单；付款方式恢复为“待确认”，结算日期、时间和备注清空。
- 网页端目前在返结算后保留到账回执引用。Android 必须保留同一引用，允许后续按 `MAINTAIN_RECEIPT` 查看、删除或替换，不能自行清空或删除 COS 文件。
- 离线状态禁止结算、返结算、回执上传和删除；401 失效会话并清理缓存；409 将服务端最新工单写回缓存并显示冲突提示；不确定结果须使用操作查询确认，不自动重试写入。

### 回执截图

- Android 使用 `ActivityResultContracts.PickVisualMedia` 选择单张图片。选择后先在本地预览，再以 `multipart/form-data` 调用既有 `POST /api/receipts`。
- 成功上传只得到服务器返回的 key、名称、MIME、字节数和上传时间；结算命令引用该元数据。取消选择或上传失败不创建结算操作。
- 工单详情和历史详情显示回执状态、文件名及上传时间；查看操作从 `GET /api/receipts?key=` 获取图片并以内存图片预览；删除使用既有 `DELETE /api/receipts`，随后以版本化命令更新工单的回执引用。
- 回执上传、删除和替换均由 `MAINTAIN_RECEIPT` 独立控制；没有该权限时不显示写入口，不以角色推断替代服务端能力。

### 日期输入与详情视觉

- 新增共享的 Android 日期字段：点击字段打开系统日期选择器，字段本身不接受自由文本，结果统一格式化为 `YYYY-MM-DD`。
- 该组件覆盖新增工单和编辑工单的保险到期日、保险档案到期日、结算日期；保留现有服务端日期校验作为最终门禁。
- 工单详情标题栏的“编辑”从白底描边胶囊改为低对比文字动作：与标题基线对齐、最小 44dp 命中区、轻量品牌色按压背景；“只读”继续使用状态胶囊，不再与编辑动作共享视觉样式。
- 详情页补齐网页端已展示的付款方式、结算时间、结算备注、回执状态、工时费和材料费；移动端不实现网页打印，打印属于允许差异的桌面效率能力。

## 统一命令合同

网页与 Android 不再用旧的整单 `upsert` 语义处理结算或返结算。新增版本化命令并复用现有 `order_operations` 幂等表、`repair_orders` 的版本列及结算/回执字段，不增加 D1 migration：

- `POST /api/orders/:id/settlement`
  - 请求：`operationId`、`expectedVersion`、`paymentMethod`、`settlementDate`、`settlementTime`、`settlementRemark`、完整回执元数据。
  - 前置条件：认证会话、管理员角色、`SETTLE_ORDER` 与 `MAINTAIN_RECEIPT` 能力、状态为“待结算”、回执 key 属于当前企业、版本匹配、工单未作废。
  - 成功：原子写入“已结算”、结算字段、回执字段、审计记录和幂等完成响应，返回完整 `OrderDetail`。
- `POST /api/orders/:id/reverse-settlement`
  - 请求：`operationId`、`expectedVersion`。
  - 前置条件：认证会话、管理员角色、`REVERSE_SETTLEMENT` 能力、状态为“已结算”、版本匹配、工单未作废。
  - 成功：原子写入“待结算”、付款方式“待确认”并清空结算日期/时间/备注；保留回执字段、审计记录和幂等完成响应，返回完整 `OrderDetail`。
- `GET /api/order-operations/:action/:operationId` 扩展支持 `settle-order` 与 `reverse-settlement`，并按公司、操作者和动作隔离结果。重复相同 `operationId` 与相同请求散列重放原结果；相同 ID 不同散列返回 `OPERATION_ID_REUSED`。

网页的 `SettlementDialog`、网页返结算确认和 Android 客户端都使用这些命令。旧 `POST /api/orders` 仍只服务既有普通编辑和兼容路径，不承担新的结算业务。

## Android 架构

- 新增结算领域模型、`OrderSettlementApi`、`OrderSettlementRepository` 和 `SettlementViewModel`，沿用现有状态命令的会话校验、网络门禁、企业隔离、版本冲突、未知结果确认、加密详情缓存与摘要缓存写回模式。
- 新增结算和返结算路由；历史详情在加载完整详情与权限后，只在满足 `REVERSE_SETTLEMENT` 时暴露返结算，不恢复普通历史写入口。
- 详情 UI 使用已加载的 `OrderDetail`，而不是只使用列表摘要，确保结算字段、回执元数据和能力均来自服务端完整结果。
- 回执 HTTP 边界独立于结算命令：上传、下载、删除各自映射 200/400/401/403/404/网络异常；上传前执行 MIME 和 12 MiB 上限检查。
- 日期字段为独立设计系统组件；创建、编辑、保险和结算页面经回调传递 ISO 日期字符串，不在页面中复制日期解析逻辑。

## 网页端对照与暂不纳入项

- 本功能包覆盖网页端结算、返结算、到账回执上传/查看/删除以及结算字段详情展示。
- 网页端“作废工单”和“已结算档案编辑”仍是 Android 的核心业务缺口，列为下一独立功能包；原因是其各自需要不同的权限、确认和审计合同，不能混入本包影响结算验收。
- 网页打印、批量导入/导出不纳入 Android，属于允许端侧差异的桌面效率功能。

## 测试与交付

- Node 合同测试覆盖命令权限、状态前置条件、版本冲突、幂等重放、跨企业拒绝、回执 key 归属和返结算保留回执。
- Android JVM 测试覆盖命令与仓储的权限/离线/401/409/未知结果处理、回执 HTTP 映射、日期格式化和 ViewModel 状态机。
- Android 测试源码覆盖详情动作可见性、结算必传回执、返结算确认、图片选择回调、日期字段和标题栏动作样式语义；按用户要求仅编译 Android 测试代码，不启动模拟器或 connected tests。
- 完整功能包完成后运行 Node 测试、网页构建、Android JVM 测试、Android 测试源码编译、Lint、Debug APK 构建；复制 APK 到 `dist/releases/android/`，用 `apksigner` 验证并提交推送。
