# Windows 客户端发布检查清单

本清单适用于 `汽修接待与车辆保险管理` 的 Windows NSIS 正式发布。每次发布都从上一正式版本执行完整验证，不得只验证全新安装。

## 1. 发布准备

- [ ] 确认 Git 工作区干净，当前分支为 `main`，并已拉取最新远端提交。
- [ ] 确认 `.tauri/chengxu-updater.key` 和密码文件存在且未被 Git 跟踪。
- [ ] 确认签名私钥已有仓库外备份，且备份可恢复。
- [ ] 在 `src-tauri/tauri.conf.json` 中递增 `version`，不得覆盖已发布版本号。
- [ ] 同步核对 `package.json` 和发布说明中使用的版本号。
- [ ] 整理本次版本说明、发布日期和安装包预计大小。

## 2. 自动化验证

- [ ] 运行 `node --test test/*.test.mjs`，确认全部通过。
- [ ] 运行 `npm.cmd run build`，确认网页生产构建成功。
- [ ] 运行 `npm.cmd run desktop:check`，确认 Rust 与 Tauri 配置通过。
- [ ] 在设置签名环境变量的同一 PowerShell 会话中运行 `npm.cmd run desktop:build`。
- [ ] 确认 `src-tauri/target/release/bundle/nsis/` 中同时生成 `.exe` 和 `.exe.sig`。
- [ ] 记录安装包 SHA-256：`Get-FileHash -Algorithm SHA256 <安装包路径>`。

## 3. Windows 安装验证

- [ ] 在测试机卸载当前测试版本后执行全新安装。
- [ ] 确认安装模式为当前用户，不要求管理员权限。
- [ ] 确认开始菜单、桌面快捷方式、应用名称和图标正确。
- [ ] 确认首次启动为最大化窗口，最小尺寸和原生标题栏正常。
- [ ] 确认重复启动时聚焦已有窗口，不产生多个业务窗口。
- [ ] 登录两家公司，抽查工单、历史、保险、客户车辆、报表和系统设置。
- [ ] 验证 Excel 原生保存、打印、外部下载链接和到账回执查看。
- [ ] 断网后确认显示网络不可用，读取与打印可用，写操作被阻止。

## 4. 上传发布文件

- [ ] 在腾讯云 COS 使用独立的客户端发布目录，例如 `releases/windows/<version>/`。
- [ ] 上传 NSIS 安装包，保留稳定且可公开下载的 HTTPS 地址。
- [ ] 上传 updater 使用的安装包或归档文件，并保留 HTTPS 地址。
- [ ] 从本地 `.sig` 文件读取完整签名，填入 Cloudflare 变量时不得增加空格或换行。
- [ ] 检查 COS 对象的 Content-Type、Content-Length、缓存策略和跨域下载策略。
- [ ] 不得将 COS SecretId、SecretKey、更新私钥或密码写入公开元数据。

## 5. Cloudflare 发布变量

- [ ] 设置 `DESKTOP_RELEASE_VERSION`，与 Tauri 版本完全一致。
- [ ] 设置 `DESKTOP_RELEASE_PUBLISHED_AT`，使用可解析的 ISO 8601 时间。
- [ ] 设置 `DESKTOP_RELEASE_SIZE`，使用面向用户的显示值。
- [ ] 设置 `DESKTOP_RELEASE_NOTES`，简要说明用户可感知变化。
- [ ] 设置 `DESKTOP_RELEASE_DOWNLOAD_URL`，指向 NSIS 安装包。
- [ ] 设置 `DESKTOP_RELEASE_UPDATE_URL`，指向 updater 下载文件。
- [ ] 设置 `DESKTOP_RELEASE_SIGNATURE`，内容与 `.sig` 完全一致。
- [ ] 重新部署 Cloudflare Pages，并等待生产部署完成。

## 6. 线上接口验证

- [ ] `GET /api/client-releases` 返回正确的 Windows 版本、大小、说明和下载地址。
- [ ] 当前版本调用 updater 接口返回 `204 No Content`。
- [ ] 较低版本调用 updater 接口返回新版本 JSON、下载地址和签名。
- [ ] 不支持的架构返回明确错误，不泄露环境变量或密钥。
- [ ] 登录页“客户端下载”可以打开、关闭并下载最新 Windows 安装包。

## 7. 跨版本自动更新验证

- [ ] 安装上一个正式版本，确认其可以正常登录和读取云端数据。
- [ ] 启动后出现非阻塞更新提示，版本号和发布说明正确。
- [ ] 点击“稍后”后当前运行不重复弹出，系统设置仍能看到更新。
- [ ] 点击“下载更新”，确认进度正常且业务页面仍可使用。
- [ ] 下载完成后不会自动重启，只有点击“更新并重启”才执行安装。
- [ ] 重启后版本号已更新，账号和本地缓存状态未丢失。
- [ ] 使用损坏的测试签名验证更新会被拒绝，旧版本仍可启动。

## 8. 发布收尾

- [ ] 将最终安装包文件名、大小、SHA-256、版本号和发布日期写入 QA 记录。
- [ ] 提交并推送所有发布配置和文档改动。
- [ ] 创建并推送标签 `desktop-vX.Y.Z`。
- [ ] 确认 GitHub、Cloudflare 和 COS 中展示的是同一个版本。
- [ ] 保存最新接力提示词，记录提交号、产物路径、接口状态和未完成事项。
