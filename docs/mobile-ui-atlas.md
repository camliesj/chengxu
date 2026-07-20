# Android 移动端 UI 图集

本目录是汽修管理系统 Android 客户端的固定数据设计原型，用于确认信息架构、权限边界、页面密度和交互状态。它不是 Android 生产客户端，不连接 API、COS 或本地存储。

## 总览图

- [登录与工作台](../design/mobile-ui/output/atlas-01-auth-workbench.png)
- [工单与弹层](../design/mobile-ui/output/atlas-02-orders-overlays.png)
- [新增与编辑](../design/mobile-ui/output/atlas-03-create-edit-flow.png)
- [档案与系统状态](../design/mobile-ui/output/atlas-04-records-system.png)

## 页面清单

| Screen ID | 中文名称 | 角色 | PNG |
| --- | --- | --- | --- |
| `login-company` | 登录与公司选择 | 通用 | [查看](../design/mobile-ui/output/login-company.png) |
| `workbench-employee` | 员工工作台 | 员工 | [查看](../design/mobile-ui/output/workbench-employee.png) |
| `workbench-admin` | 管理员工作台 | 管理员 | [查看](../design/mobile-ui/output/workbench-admin.png) |
| `orders-current` | 当前工单 | 通用 | [查看](../design/mobile-ui/output/orders-current.png) |
| `orders-filter-sheet` | 工单筛选 | 通用 | [查看](../design/mobile-ui/output/orders-filter-sheet.png) |
| `order-detail-employee` | 员工工单详情 | 员工 | [查看](../design/mobile-ui/output/order-detail-employee.png) |
| `order-detail-admin` | 管理员工单详情 | 管理员 | [查看](../design/mobile-ui/output/order-detail-admin.png) |
| `order-create-customer` | 新增工单：客户车辆 | 通用 | [查看](../design/mobile-ui/output/order-create-customer.png) |
| `order-create-insurance` | 新增工单：保险事故 | 通用 | [查看](../design/mobile-ui/output/order-create-insurance.png) |
| `order-create-repair` | 新增工单：维修费用 | 通用 | [查看](../design/mobile-ui/output/order-create-repair.png) |
| `order-create-review` | 新增工单：确认提交 | 通用 | [查看](../design/mobile-ui/output/order-create-review.png) |
| `order-edit` | 编辑工单 | 通用 | [查看](../design/mobile-ui/output/order-edit.png) |
| `order-status-dialog` | 状态确认 | 通用 | [查看](../design/mobile-ui/output/order-status-dialog.png) |
| `order-settlement` | 结算工单 | 管理员 | [查看](../design/mobile-ui/output/order-settlement.png) |
| `receipt-upload` | 到账回执 | 管理员 | [查看](../design/mobile-ui/output/receipt-upload.png) |
| `reverse-settlement-dialog` | 返结算确认 | 管理员 | [查看](../design/mobile-ui/output/reverse-settlement-dialog.png) |
| `records-customers` | 客户车辆档案 | 通用 | [查看](../design/mobile-ui/output/records-customers.png) |
| `records-insurance` | 车辆保险档案 | 通用 | [查看](../design/mobile-ui/output/records-insurance.png) |
| `records-history` | 维修历史 | 通用 | [查看](../design/mobile-ui/output/records-history.png) |
| `profile-sync` | 我的与同步状态 | 通用 | [查看](../design/mobile-ui/output/profile-sync.png) |
| `offline-readonly` | 离线只读 | 通用 | [查看](../design/mobile-ui/output/offline-readonly.png) |
| `states-gallery` | 系统状态合集 | 通用 | [查看](../design/mobile-ui/output/states-gallery.png) |

## 品牌交互原型

- 本地入口：`http://127.0.0.1:4175/?prototype=brand`
- 登录后可切换员工/管理员，使用“工作台 / 工单 / 新增 / 档案 / 我的”五栏导航，并验证离线只读与退出确认。
- 图标统一使用官方 Hugeicons；车辆 Hero 与维修工具为空间匹配的透明 PNG 素材，清单位于 `design/mobile-ui/src/assets/brand/asset-manifest.js`。
- 状态合集覆盖默认、悬停、按下、聚焦、禁用和选中；最终截图与同屏对比板位于 `design/mobile-ui/output/`。
- 阻塞式视觉复核见 [`design/mobile-ui/design-qa.md`](../design/mobile-ui/design-qa.md)，当前 `final result: passed`。
- 2026-07-20 最终验证：网页单元测试 64/64、移动 UI Playwright 108/108、确定性截图 34/34；独立原型构建与仓库生产构建均成功。
- HTML 原型不调用生产 API、不持久化凭据；真实工单 API 与 Room 缓存仍暂停，下一设计检查点是单独规划 Compose 移植。

## 使用命令

```powershell
npm.cmd run design:mobile
npm.cmd run test:mobile-ui
npm.cmd run design:mobile:capture
```

运行原型后，可通过 `http://127.0.0.1:4175/?screen=<screen-id>` 查看单页，通过 `?atlas=<group>` 查看总览。总览组为 `auth-workbench`、`orders-overlays`、`create-edit-flow` 和 `records-system`。

## 视觉规范

- 页面背景：`#F5F7FA`
- 内容表面：`#FFFFFF`
- 主色：`#1677FF`
- 主文字：`#18212F`
- 次文字：`#5D6A7F`
- 边框：`#D7DEEA`
- 圆角：`8px`
- 基准画布：`390 × 844`
- 图标：品牌原型使用 Hugeicons Stroke Rounded，旧图集页面保留既有 Lucide；状态同时使用图标和文字，不只依赖颜色

## 权限边界

- 员工可查看和编辑工单，并将状态推进到“待结算”。
- 员工不可结算、返结算、作废工单或维护到账回执。
- 管理员可完成结算、上传到账回执、返结算和作废工单。
- 离线时仅允许查看最近同步的缓存数据，所有写操作禁用。
- 已结算工单进入维修历史，当前工单只保留未结算业务。
