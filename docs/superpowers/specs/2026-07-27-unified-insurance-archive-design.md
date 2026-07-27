# 保险档案跨端一致化设计

日期：2026-07-27  
状态：待用户审阅  
范围：网页端与 Android 共享保险档案的查询、新增、编辑和删除；网页保留管理员批量导入。

## 1. 目标与边界

保险档案的业务事实必须只存在于 Cloudflare D1。网页端和 Android 都通过同一套企业隔离、权限、校验、版本冲突与幂等规则读写，不再由任一客户端静默覆盖另一端的更新。

本批在 Android“档案”根页增加第三个“保险档案”标签，支持搜索、到期状态、详情、新增、编辑和删除。网页端继续提供同样的单条 CRUD，并保留仅管理员可用的批量导入；批量导入是桌面文件效率能力，不是移动端缺失的业务事实。删除、导入、写入均在线执行；离线仅展示当前企业的加密缓存。

不包含客户车辆写入、历史工单字段修正、结算/返结算/作废、回执、导出或后台自动提交。

## 2. 统一服务端合同

现有 `/api/insurance-policies` 只有无版本的 GET/POST upsert，不能安全处理网页与 Android 并发。本批把它升级为唯一的版本化合同，并在同一改动中把网页迁移到该合同：

- `GET /api/insurance-policies`：返回当前会话企业的 `{ policies }`；每项含 `id`、`companyId`、`version`、`plate`、`customer`、`phone`、`car`、`vin`、`expiry`、`amount`、`type`、`insurer`、`updatedAt`。
- `POST /api/insurance-policies`：请求 `{ operationId, expectedVersion, policy }`。新建时 `expectedVersion` 为 `null`；编辑时必须等于服务器版本。服务端忽略客户端 `companyId` 与版本，按会话企业写入并将版本递增。
- `DELETE /api/insurance-policies/{id}`：请求带 `operationId` 和 `expectedVersion`；成功后删除本企业该记录。删除不存在、跨企业或版本冲突均不泄露其他企业数据。
- `POST /api/insurance-policies` 的 `{ action: "import", records }` 继续仅管理员可用。每条导入按企业归属、字段校验写入；导入不覆盖已有同企业 ID。网页先改用版本化读取/写入，保证两端没有两套协议。

每个在线写操作记录 `operationId`、请求哈希与最终结果，重复请求返回首次结果；版本不一致返回 `409 VERSION_CONFLICT` 和当前安全摘要。写入和删除均写入操作日志。接口继续以 `insurance` 服务端权限裁决；Android 的 `AppPermission` 增加独立的 `MANAGE_INSURANCE` 映射，以免把所有档案修正权限一并放开。

## 3. 数据、缓存与安全

为 `insurance_policies` 添加 `version` 和结构化更新时间字段的 D1 migration；保留 `record_json` 兼容历史数据。读取时服务端规范化历史 JSON 并补齐版本/更新时间。Android Room 继续复用 v2 的 `insurance_policies(companyId, recordId, encryptedPayload, updatedAt)` 表，不升级 schema；整包数据加密，主键按企业隔离。

Android repository 的刷新策略与客户车辆一致：在线 GET 后原子替换当前企业缓存；离线不请求网络；网络/5xx/畸形响应保留可解密缓存并显示陈旧提示；401 清理全部身份数据并回到登录；403 不显示是否存在其他企业记录。成功创建、编辑、删除用服务器返回结果原子更新缓存；冲突不覆盖本地缓存，提示重新读取并让表单以服务器版本重新打开。

## 4. 界面与权限

“档案”标签固定为“维修历史 / 客户车辆 / 保险档案”，三个页面各自保存搜索与返回栈。保险列表按车牌、客户、电话、车型、保险公司搜索，并显示到期状态（已过期、7 天内到期、正常）和到期日。详情展示全部字段。

具备 `insurance` 服务端权限的用户都可读取；单条新增、编辑、删除跟随该服务端权限。Android UI 只在会话 `MANAGE_INSURANCE` 授权时显示写入口，且离线、提交中或无权限时禁用并给出明确原因。表单字段与网页使用同一规则：车牌、客户、到期日必填；金额是非负整数；车型、电话、VIN、险种和保险公司允许为空但会去首尾空白。移动端不提供文件导入按钮。

## 5. 测试与验收

- Functions 测试覆盖企业隔离、权限拒绝、版本冲突、幂等重试、删除、管理员导入不覆盖已有记录。
- 网页测试覆盖新建/编辑/删除后刷新、冲突提示及既有导入。
- Android JVM 测试覆盖 HTTP 映射、加密缓存、离线、401、403、冲突和重复操作；Compose/Android 测试代码覆盖标签、表单禁用与详情。
- 最终执行网页测试与生产构建、Android 单元测试、Android 测试代码编译、lint 和 Debug APK 构建；生成签名校验过的 APK。真实设备重点验证网页改动后 Android 刷新、Android 改动后网页刷新，以及离线写入被拒绝。

## 6. 实施顺序

1. D1 migration、共享保险契约、Functions 版本化 CRUD/幂等/审计及网页适配。
2. Android HTTP 合同、加密缓存、仓储与权限映射。
3. Android 三标签档案页、保险列表/详情/表单与冲突处理。
4. 双端全量验证、APK、交接文档与提交推送。
