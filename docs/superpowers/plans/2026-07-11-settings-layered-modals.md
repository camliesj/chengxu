# Settings Layered Modals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把系统设置的长页面展开区改为三级弹窗管理体验。

**Architecture:** `SystemSettingsPage` 管理当前一级弹窗、编辑弹窗和删除确认状态；可复用的弹窗外壳负责遮罩、标题栏和滚动区域。原有保存、删除和刷新函数保持为数据层入口。

**Tech Stack:** React 19、原生 CSS、Vite、Cloudflare Pages/D1

## Global Constraints

- 不新增 UI 运行时依赖。
- 保持当前浅色科技风和 8px 圆角。
- 不改变字典、账号、权限及日志 API。
- 关闭遮罩只能关闭最上层窗口。

---

### Task 1: 弹窗状态与入口卡片

**Files:**
- Modify: `src/App.jsx`

- [ ] 用 `activeSettingsModal` 替换 `collapsedSections`。
- [ ] 将四个展开区域改为入口卡片。
- [ ] 打开账号和日志弹窗时调用现有刷新函数。

### Task 2: 一级管理与二级编辑弹窗

**Files:**
- Modify: `src/App.jsx`

- [ ] 新增通用 `SettingsModal` 外壳。
- [ ] 字典一级弹窗展示列表，二级弹窗展示字典表单。
- [ ] 账号一级弹窗展示账号卡片，二级弹窗展示账号与权限表单。
- [ ] 日志一级弹窗展示固定表头和独立滚动表格。

### Task 3: 删除确认与视觉样式

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/styles.css`

- [ ] 删除操作进入三级确认弹窗。
- [ ] 为三个弹窗层级配置遮罩、z-index、固定标题栏和独立滚动。
- [ ] 添加桌面和移动端响应式布局。

### Task 4: 验证与交付

**Files:**
- Verify: `src/App.jsx`, `src/styles.css`

- [ ] 运行 `npm.cmd run build`，预期退出码 0。
- [ ] 部署 Cloudflare Pages 并确认新资源指纹返回 200。
- [ ] 提交并推送 GitHub，输出接力提示词。
