# 智维车服 Android 安装二维码与正式发布设计

## 目标

将已签名校验的 Android Debug APK 以正式 HTTPS 下载地址发布到现有 Tencent COS 私有存储，并在网页和 Windows 桌面客户端共用的登录页“客户端下载”区域提供可扫描的 Android 安装二维码。

## 已确认的产品决定

- 采用方案 A：APK 进入现有发布存储，由受控下载路由流式返回；二维码直接编码该稳定的 HTTPS APK 下载 URL。
- 二维码放在登录表单下方、现有“客户端下载”入口的位置；二维码旁保留“下载 Android APP”文字按钮作为键盘、读屏和无法扫码时的后备入口。
- 网页端和 Windows 客户端都复用同一个 `AccessGate`，因此同一实现覆盖两端；Android 自己的登录页不显示“安装自己”的二维码。
- 未发布 Android 包时不生成空/错误二维码，改为显示“Android 安装包发布中”，且下载按钮禁用。

## 发布与下载边界

1. 管理员将 APK 通过现有 `POST /api/release-artifacts` 上传；上传接口新增且仅接受 `.apk` 与 `application/vnd.android.package-archive` 或 `application/octet-stream`，文件上限维持 25 MiB。
2. 共享发布辅助函数以平台维度验证名称并生成 COS key：`releases/android/<version>/zhiwei-car-service_<version>.apk`。Windows 的现有 key、校验和下载路由完全不变。
3. 新增公开只读 `GET /api/client-downloads/android/:version/:fileName`。它重用 COS 签名读取、文件名安全检查、附件响应头与长期缓存策略；不暴露 COS 凭据或对象 key。
4. 使用 Wrangler 设置 `ANDROID_RELEASE_VERSION`、`ANDROID_RELEASE_PUBLISHED_AT`、`ANDROID_RELEASE_SIZE`、`ANDROID_RELEASE_NOTES`、`ANDROID_RELEASE_DOWNLOAD_URL`。`GET /api/client-releases` 因此返回 `android.available=true` 与正式 URL。

## 登录页二维码

- 登录页打开后仅请求一次公开 `/api/client-releases`；取其中 `android.downloadUrl` 作为二维码唯一内容。
- 使用前端本地 QR 组件生成 SVG/Canvas，不调用第三方二维码服务，也不把下载地址上报给外部服务。
- 成功状态展示简洁的二维码卡片、Android 版本与包大小、下载后备按钮；点击后用现有 `openExternal` 打开同一 URL。
- 请求失败或 Android 未发布时，保留“客户端下载”弹窗入口，并在二维码区域呈现可重试的明确状态，不影响登录表单。
- 二维码卡片的视觉语言沿用智维车服：浅冰蓝边框、深石墨标题、冰蓝强调，不与登录主按钮竞争。

## 品牌落实

- 将已确认的主图作为唯一源图，生成 Vite favicon、Tauri Windows icon 集及 Android launcher/adaptive icon；`AndroidManifest.xml` 显式引用 launcher 图标。
- 所有用户可见产品名替换为“智维车服”，包括网页 document title、桌面产品名/窗口标题、Android 应用标签、Android 登录页和网页登录标题。
- 保持 `com.chengxu.autoservice`、`com.chengxu.repairmanager`、`Theme.Autoservice`、`autoservice.db`、`chengxu-*` 存储键、D1/COS 现有标识和 API 路径不变。

## 验证与非目标

- 新增 Node 合同测试覆盖 Android APK 文件校验、COS key、下载路径、上传 content type、公开下载路由和 Android release metadata；新增前端逻辑测试覆盖二维码状态和下载 URL。
- 运行 Node 全量测试、Vite build、Tauri metadata check、Android JVM/test-source/lint/Debug APK 构建及 `apksigner verify --verbose`；在已授权模拟器安装包，确认 launcher 图标与“智维车服”标签。
- 发布后只读请求校验 `/api/client-releases` 的 Android 条目与 APK 下载响应；不创建/修改业务订单、档案或权限数据。
- 本功能不新增 D1/Room migration，不改变业务接口、订单状态或权限模型。
