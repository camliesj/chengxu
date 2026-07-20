# Android 品牌 HTML 原型 Design QA

## 对比范围

- 视觉真值：`design/mobile-ui/reference/xpeng-ui-overview.png`、`design/mobile-ui/reference/xpeng-ui-interaction-states.png`
- 实现截图：`design/mobile-ui/output/brand-prototype-login.png`、`brand-prototype-workbench-employee.png`、`brand-prototype-workbench-admin.png`、`brand-prototype-profile.png`、`brand-prototype-offline.png`、`brand-prototype-logout-dialog.png`
- 同屏对比证据：`qa-login-comparison.png`、`qa-workbench-comparison.png`、`qa-overlay-comparison.png`
- 交互状态证据：`states-gallery-hover.png`、`states-gallery-pressed.png`、`states-gallery-focus.png`、`states-gallery-disabled.png`
- 视口：390 × 844，浅色主题，1× device scale，reduced motion
- 状态：未登录、员工工作台、管理员工作台、个人页、离线只读、退出确认；另验证 360 × 800 与 412 × 915 响应式布局

参考图是多屏汽车品牌 App 合集，而不是汽修工作台的一一对应稿。对比因此以参考图的组件语言、密度、圆角、字重、冰蓝背景、近黑动作、五栏导航和弹层表达为视觉真值，同时保留已批准的汽修业务信息架构。

## 全景与聚焦证据

- 全景：登录、员工/管理员工作台、个人页、离线态和退出弹层均已在 390 × 844 浏览器渲染截图中复核；五栏导航固定，内容区独立滚动，首屏没有横向裁切或越界主操作。
- 聚焦：三张 804 × 884 同屏板分别比较登录表单与主按钮、工作台卡片/文字层级/底部导航、弹层圆角/遮罩/双动作。重要细节在同屏板中可读，因此无需再做更小的局部裁切。
- 浏览器路径：登录 → 管理员切换 → 工单 → 新增 → 档案 → 工作台 → 我的 → 退出弹层取消 → 再次退出；控制台错误 0，页面异常 0。

## 必查视觉面

- 字体与排版：使用 Inter、Segoe UI 和系统无衬线回退；中文标题采用近黑高字重，说明文字使用灰阶。管理员副标题已由 39px 两行修正为单行，标题、指标和按钮没有截断。
- 间距与布局节奏：登录使用大图与悬浮白面板，工作台采用 16px 主节奏、20–22px 面板圆角和紧凑四列状态带；五栏导航与参考图一样保持底部稳定。360/390/412 三档均无横向溢出。
- 颜色与令牌：白、雾灰、浅冰蓝和近黑为主，成功/警告/危险只作语义辅助；选中态同时具有边框、阴影和 `aria-pressed`，不只依赖颜色。
- 图像质量与素材：登录车辆和维修工具均为生成后去底的 RGBA PNG，边缘、缩放和裁切正常；可见 UI 图标统一来自 Hugeicons，没有 Emoji、手绘 SVG、CSS 图形或占位图。
- 文案与内容：企业、角色、指标、工单与离线说明均使用真实汽修语义；管理员身份在工作台与个人页统一为“李经理 / 管理员”。阶段页明确说明尚未接入，不伪造生产写入结果。

## 对比历史与修复

### 第 1 轮（blocked）

- [P2] “查看全部”按钮高度只有 40px，低于已批准的 48px 触控目标。修复：提升为 48px，并用全页面可见按钮尺寸测试锁定。
- [P2] 管理员工作台副标题在 390px 宽度下高度为 39px、发生两行换行，降低首屏密度。修复：品牌工作台副标题移除 `28ch` 限宽；复测高度不超过 20px。
- [P2] 管理员工作台问候为“李经理”，个人页仍显示“张工”。修复：个人页按角色显示“李经理”或“张工”，并增加跨页身份一致性测试。

### 第 2 轮（passed）

- 修复后重新运行状态化截图，并重新打开参考图与三张同屏对比板进行比较。
- 登录表单、工作台、弹层、底部导航和四种交互状态未发现仍需处理的 P0/P1/P2。
- 48px 目标、可见焦点、禁用不响应、焦点循环/返回和非颜色选中语义均有浏览器自动化证据。

## Findings

没有仍需处理的 P0/P1/P2。

## Open Questions

- 参考图的内容页以社区/媒体为主，当前工作台按用户已批准的“参考视觉语言 + 汽修业务信息架构”实现，而非复制媒体内容；该差异为预期约束。

## Implementation Checklist

- [x] 390 × 844 同屏视觉对比
- [x] 360/390/412 响应式与无横向溢出
- [x] 默认、悬停、按下、聚焦、禁用与选中状态
- [x] Hugeicons 与透明 PNG 素材
- [x] 角色权限、五栏导航、离线态与退出弹层
- [x] 浏览器主流程与控制台错误检查

## Follow-up Polish

- [P3] Compose 移植时再按真实 Android 状态栏与系统字体渲染校准顶部安全区和小字号光学重量；不影响 HTML 原型验收。

final result: passed
