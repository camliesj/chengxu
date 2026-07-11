# Dashboard 21st Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用 21st 组件设计语言重构汽修管理系统首页，同时保留全部现有业务数据与交互。

**Architecture:** 继续在 `Dashboard` 中派生现有统计数据，调整 JSX 的信息顺序并复用既有回调。样式集中在 `src/styles.css` 的 workbench 区域，避免引入 Tailwind、shadcn 或额外运行时依赖。

**Tech Stack:** React 19、Vite 6、原生 CSS、Cloudflare Pages

## Global Constraints

- 保持浅色科技风，圆角不超过 8px。
- 不增加演示数据，不改变云端数据接口。
- 橙色只表示待结算，红色只表示保险风险，绿色只表示正常或已结算。
- 所有现有首页跳转与刷新功能必须保留。

---

### Task 1: 重排首页信息架构

**Files:**
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: `filteredOrders`, `policies`, `dateRange` 以及 Dashboard 现有回调。
- Produces: `dashboard-kpis`, `dashboard-overview-grid`, `status-strip` 和最近工单区域。

- [ ] 将指标精简为首屏五项，保留点击动作。
- [ ] 将趋势、状态分布和待办组织为主工作区。
- [ ] 将四列高面板改为紧凑状态卡，展示最近一条对应工单。
- [ ] 保留保险提醒和最近工单，调整顺序与容器类名。

### Task 2: 建立 21st 风格视觉系统

**Files:**
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: Task 1 新增的 className。
- Produces: 桌面、中屏和移动端响应式布局。

- [ ] 重写经营摘要、KPI、主工作区、待办和状态卡样式。
- [ ] 为最近工单增加固定表头和独立滚动容器。
- [ ] 统一边框、阴影、圆角、字号和风险色。
- [ ] 补齐 1200px、900px 和 640px 响应式规则。

### Task 3: 验证与交付

**Files:**
- Modify: `README.md`（仅当接力说明需要更新）

**Interfaces:**
- Consumes: 完成后的页面。
- Produces: 构建产物、浏览器截图、Cloudflare Pages 部署和 Git 提交。

- [ ] 运行 `npm.cmd run build`，预期退出码 0。
- [ ] 启动本地预览并检查桌面与移动布局。
- [ ] 验证首页刷新和各类跳转。
- [ ] 部署 Cloudflare Pages。
- [ ] 提交并推送 GitHub，输出最新接力提示词。
