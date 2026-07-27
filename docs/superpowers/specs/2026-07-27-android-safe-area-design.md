# Android 全局状态栏安全区设计

## 目标

修复 Android 15+ 边到边布局下，工单详情及其他全屏页面的标题、返回按钮与系统状态栏重叠的问题。所有应用路由必须从状态栏下方开始排版，同时保持现有底部五栏导航的高度与交互位置。

## 范围

- 在 `AutoserviceApp` 的根 Compose 容器统一消费顶部系统栏 inset。
- 覆盖登录、恢复、五栏首页、工单详情、新增、编辑、状态确认和个人页。
- 不修改业务导航、网络、数据库、生产能力或底部导航行为。
- 不启动 Android 模拟器；保留 JVM 测试、Android 测试源码编译、Lint 和 APK 构建。

## 方案

根容器使用 Compose 的 `statusBarsPadding()`（仅顶部）包裹认证前后所有内容，并保持 `AutoserviceColors.Canvas` 作为安全区背景。内容区域会从系统状态栏下方起始；`NavigationBar` 继续由 Material 组件处理底部导航栏 inset，避免额外 bottom padding 造成双重留白。

不采用逐页增加 padding 的方案，因为新增路由容易遗漏；不通过 `setDecorFitsSystemWindows(true)` 退出边到边模式，以免破坏 Android 15+ 的系统栏适配。

## 验收与回归

1. Compose 回归测试验证根安全区修饰符存在，并确保详情标题与根导航仍可展示。
2. 执行相关 JVM 测试、`:app:compileDebugAndroidTestKotlin`、`:app:lintDebug` 和 `:app:assembleDebug`。
3. 生成 Debug APK，由真实手机验证顶部标题、返回按钮及编辑/状态确认页不再与状态栏重叠；底部五栏保持可点击。

## 风险

顶部可用高度会减少一个状态栏高度，但现有详情与表单均为可滚动布局；不影响数据或写入流程。真实手机需要覆盖刘海/打孔屏、大字体及横屏场景。
