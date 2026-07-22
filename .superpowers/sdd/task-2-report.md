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

### 审查返修 RED

收到 Task 2 审查后，先补 focused 测试，再执行：

`npm.cmd run test:mobile-ui -- --grep "company selection|shared shell|offline placeholder|workbench-admin registered|login screen|phone shell"`

结果：

- `company selection switches to the second company` 失败
- `placeholder routes use the shared shell and keep workbench-admin registered` 失败
- `shared shell keeps bottom nav pinned while main scrolls` 失败
- `offline placeholder shows the offline strip inside the shared shell` 失败

失败原因：

- 公司选择仍是静态选中态，没有真实 state 切换
- 非 auth 占位页仍使用旧 `phone-shell`，没有共享 `MobileShell + BottomNav`
- 壳层缺少 `data-mobile-main` / `data-mobile-nav`，且未形成稳定三段布局
- `offline-readonly` 占位路由没有复用共享壳层上的离线提示条

### 审查返修 GREEN

完成壳层改造、占位路由接入、公司单选交互与 MetricCard tone 变体后，重新执行：

`npm.cmd run test:mobile-ui -- --grep "company selection|shared shell|offline placeholder|workbench-admin registered|login screen|phone shell"`

结果：

- 6 / 6 通过

覆盖点：

- 点击第二家公司后 `aria-pressed` 正确切换
- 选中项显示 `CheckCircle2`，未选中项显示空心圆
- `workbench-admin` 仍为占位路由，但已挂共享底栏
- 长内容下 `main` 可滚动且 `BottomNav` 仍贴合 phone shell 底部
- `offline-readonly` 占位页可见离线提示条

## 最终验证

执行：

`npm.cmd run test:mobile-ui`

结果：

- Node catalog tests 3 项通过
- Playwright 路由与视觉测试 12 项通过

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
- `MobileShell` 已改为稳定三段式 grid：语义 header、独立滚动 main、固定底部五栏导航
- 非 auth 占位路由已复用共享壳层与底栏，可直接作为后续任务的壳层回归面
- `MetricCard` 已实现 `neutral / primary / success / warning / danger` 视觉变体
- 360 / 390 / 412 三档宽度均验证 `scrollWidth <= clientWidth`
- 主按钮 `进入系统` 在三档宽度下均保持在视口内
- 长内容占位页已验证仅主滚动区移动，底部导航边界稳定

## 疑虑

- `routing.spec.mjs` 里的原有 “placeholder” 命名仍未调整；它们当前验证的是路由存在性，不影响行为正确性，但后续可以顺手改名以降低语义噪音。
