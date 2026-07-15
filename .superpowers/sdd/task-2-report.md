# Task 2 Report: 共享移动组件与登录页

## 任务结果

- 已新增共享移动壳层、底部导航、状态标签、指标卡、表单控件与固定示例数据。
- 已将 `login-company` 从占位映射替换为真实 `LoginCompanyScreen`。
- 其余 21 个 screen id 继续走占位映射，`?screen` 路由未回归。
- 未修改生产 `src/App.jsx`。

## 变更文件

- `design/mobile-ui/src/mock-data.js`
- `design/mobile-ui/src/components/MobileShell.jsx`
- `design/mobile-ui/src/components/BottomNav.jsx`
- `design/mobile-ui/src/components/StatusPill.jsx`
- `design/mobile-ui/src/components/MetricCard.jsx`
- `design/mobile-ui/src/components/FormControls.jsx`
- `design/mobile-ui/src/screens/AuthScreens.jsx`
- `design/mobile-ui/src/screens/registry.jsx`
- `design/mobile-ui/src/app.css`
- `design/mobile-ui/tests/visual.spec.mjs`

## TDD 证据

### RED

先新增 `design/mobile-ui/tests/visual.spec.mjs`，只写登录页与壳层测试，再执行：

`npm.cmd run test:mobile-ui -- --grep "login screen|phone shell"`

结果：

- `login screen exposes company choice and credentials` 失败
- `phone shell has no horizontal overflow` 失败

失败原因：

- `getByRole('heading', { name: '选择门店' })` 找不到，说明 `login-company` 仍是占位页
- `[data-mobile-shell]` 找不到，说明共享移动壳层尚未实现

### GREEN

实现共享组件与真实登录页后，重新执行：

`npm.cmd run test:mobile-ui -- --grep "login screen|phone shell"`

结果：

- 2 / 2 通过

再补充三档手机宽度响应式测试后执行：

`npm.cmd run test:mobile-ui -- --grep "login responsive"`

结果：

- `login responsive at 360` 通过
- `login responsive at 390` 通过
- `login responsive at 412` 通过

## 最终验证

执行：

`npm.cmd run test:mobile-ui`

结果：

- Node catalog tests 3 项通过
- Playwright 路由与视觉测试 8 项通过

执行：

`npm.cmd run build`

结果：

- 生产 Vite build 成功
- 证明本次改动未破坏生产入口，`src/App.jsx` 未被修改

## 视觉自检

- 登录页为安静浅色界面，主背景使用 `#F5F7FA`，表面使用 `#FFFFFF`
- 组件圆角统一保持 8px
- 页面包含双公司选择、账号、密码、主按钮与网络安全提示
- 未出现访问码提示
- 未出现 logo 插画
- 表单使用真实 `label` 与原生表单控件，便于可访问性查询
- 底部导航使用 Lucide 图标，中心 `新增` 为蓝色圆形按钮
- 360 / 390 / 412 三档宽度均验证 `scrollWidth <= clientWidth`
- 主按钮 `进入系统` 在三档宽度下均保持在视口内

## 疑虑

- 当前 `BottomNav`、`StatusPill`、`MetricCard` 已按 Task 2 交付为共享基础件，但登录页暂未实际挂载底部导航；后续工作台与业务屏会复用这些基础件。
- `routing.spec.mjs` 里的原有 “placeholder” 测试名称未改，但实际验证的仍是 `login-company` 路由可用与中文文案可见，不影响当前任务结果。
