# 智纬 Android 手动检查更新与应用内安装设计

## 目标

让已登录的 Android 用户可在“我的”页手动检查智纬的新版本；发现更高版本后，在应用内下载官方 HTTPS APK，并交给 Android 系统安装器完成安装。

## 产品决定

- 仅手动检查：不在启动、登录或后台自动请求更新，也不强制更新。
- 入口放在“我的”页，显示当前 App 版本，并提供“检查更新”操作。
- 客户端复用公开的 `GET /api/client-releases` 的 Android 发布元数据；只有 `available=true`、HTTPS 下载地址和严格高于本机版本的版本号才可更新。
- 新版本弹窗展示版本、发布时间、包大小与更新说明。用户确认后才开始下载。
- APK 下载到应用专属外部下载目录，下载过程显示进度、失败原因和重试操作；不写入业务数据库或加密业务缓存。
- 下载成功后通过 `FileProvider` 只读内容 URI 调用系统安装器。若系统未授予“允许此来源安装未知应用”，先打开该系统设置页，并保留已下载 APK 以供用户返回后再次安装。
- 不新增 D1 或 Room migration，不改变订单、档案、权限或认证合同。

## 架构与边界

1. `UpdateApi` 负责调用 `/api/client-releases`，解析并严格校验 Android 条目。网络、HTTP 和畸形响应需要可区分地返回给 ViewModel。
2. 纯 Kotlin 版本比较器仅接受数值点分版本，例如 `0.1.1`；无效远端版本、相同版本、降级版本均视为“已是最新”。
3. `AppUpdateDownloader` 负责 HTTPS 下载、文件名固定、临时文件写入和原子替换；仅接受由 API 返回的 HTTPS URL，并将每次进度转换为状态。
4. `AppUpdateInstaller` 负责生成 FileProvider URI、检查未知来源安装授权并启动安装或授权设置 Intent。安装决定始终由系统界面和用户确认。
5. `UpdateViewModel` 将检查、可更新、下载、等待授权、准备安装、失败与重试状态投射到 Compose 界面。UI 不直接做网络、文件或 Intent 操作。

## 安全与兼容性

- 只请求现有生产 API 域和 HTTPS APK URL；下载前拒绝空 URL、非 HTTPS URL、无效版本和未发布条目。
- 下载写入应用专属目录；FileProvider 不暴露目录列表，仅临时授予安装器读权限。
- 增加 `REQUEST_INSTALL_PACKAGES` 声明与 FileProvider 配置，不请求存储读写权限。
- 现有安装包当前使用同一签名才能覆盖安装；发布新版本必须递增 `versionCode` 与 `versionName`，并使用稳定的生产签名。若签名不同，系统会拒绝覆盖安装并由界面给出说明。

## 交互与异常

- 检查中禁用重复点击并显示进度；无新版显示“已是最新版本”。
- 有新版时用户可“暂不更新”或“立即下载”。
- 下载被取消、网络中断、HTTP 非 200、无存储空间、文件写入失败和安装 Intent 不可用时均显示原因与“重试下载”或“重新安装”。
- 不能安装未知来源时不伪装为安装成功；用户在系统设置授权后回到 App，点击“安装更新”即可继续。

## 测试与验收

- JVM：覆盖发布 JSON 解析、版本比较、无新版/新版/畸形/非 HTTPS 发布条目以及 ViewModel 状态转换。
- Android 编译：覆盖 FileProvider manifest 配置、下载目录与安装 Intent 的 Android 测试代码编译。
- 回归：执行 Android JVM 测试、`compileDebugAndroidTestKotlin`、lint 和 `assembleDebug`；重新生成可安装 APK，并进行 `apksigner` 校验。
- 真机验收：手动检查显示无新版；发布一个更高版本后显示说明、下载进度、未知来源授权提示和系统安装器。
