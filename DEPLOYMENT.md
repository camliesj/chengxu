# Cloudflare Pages 部署说明

本项目使用 React + Vite，生产构建目录是 `dist`。

## 一键部署

```bash
npm run deploy
```

这个命令会先执行生产构建，然后把 `dist` 发布到 Cloudflare Pages 项目 `chengxu`。项目名通过命令参数指定，避免影响 Cloudflare Pages 后台已经配置好的 Git 自动部署。

## Cloudflare Pages 后台配置

如果在 Cloudflare Pages 网页后台绑定 GitHub 仓库，使用以下配置：

- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: 留空或使用仓库根目录

当前 Cloudflare Pages 项目 `chengxu` 已按以上规则配置，后续推送 `main` 分支会自动构建并发布 `dist`。

## Windows 客户端签名发布

Windows 客户端使用 Tauri 2 的 updater 签名机制。仓库只保存更新公钥，私钥和密码必须保存在本机被忽略的 `.tauri/` 目录或安全的 CI 密钥中，严禁提交到 Git。

本机现有签名文件：

```text
.tauri/chengxu-updater.key
.tauri/chengxu-updater.password
```

构建签名安装包前，在同一个 PowerShell 会话中设置：

```powershell
$env:TAURI_SIGNING_PRIVATE_KEY=(Resolve-Path -LiteralPath '.tauri\chengxu-updater.key').Path
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD=(Get-Content -LiteralPath '.tauri\chengxu-updater.password' -Raw).Trim()
npm.cmd run desktop:build
```

构建完成后，`src-tauri/target/release/bundle/nsis/` 应同时包含 NSIS 安装包和对应的 `.sig` 签名文件。发布前按照 [Windows 发布检查清单](docs/windows-release-checklist.md) 完成版本、上传、Cloudflare 变量和跨版本升级验证。

Cloudflare Pages 使用以下公开版本变量生成下载信息和 updater 响应：

```text
DESKTOP_RELEASE_VERSION
DESKTOP_RELEASE_PUBLISHED_AT
DESKTOP_RELEASE_SIZE
DESKTOP_RELEASE_NOTES
DESKTOP_RELEASE_DOWNLOAD_URL
DESKTOP_RELEASE_UPDATE_URL
DESKTOP_RELEASE_SIGNATURE
```

安装包和 updater 文件建议上传到腾讯云 COS 的独立公开发布目录。到账回执图片仍使用私有目录，两类文件不要混用权限策略。

## 云端数据库

维修工单已接入 Cloudflare D1：

- Database: `chengxu-db`
- Binding: `DB`
- Schema: `migrations/0001_create_repair_orders.sql`
- Test data: `seed/repair-orders-test-data.sql`

线上接口：

```text
GET /api/orders
POST /api/orders
POST /api/receipts
GET /api/receipts?key=<receipt-key>
DELETE /api/receipts
```

## 腾讯云 COS 回执图片

结算到账回执截图使用腾讯云 COS 存储，前端不会保存 COS 密钥。Cloudflare Pages Functions 通过以下环境变量在服务端签名上传、读取和删除图片：

```text
TENCENT_SECRET_ID
TENCENT_SECRET_KEY
COS_BUCKET
COS_REGION
```

配置方式：

1. 在腾讯云 COS 创建私有 Bucket。
2. 创建只允许访问该 Bucket 的 SecretId / SecretKey。
3. 在 Cloudflare Pages 项目 `chengxu` 的环境变量中添加以上 4 项。
4. 重新部署 Pages。

回执接口说明：

- `POST /api/receipts`：上传 JPG / PNG / WEBP 回执截图。
- `GET /api/receipts?key=...`：登录后读取回执图片。
- `DELETE /api/receipts`：删除指定回执图片。
- 工单结算后，回执 key、文件名、文件类型、大小和上传时间会写入 `repair_orders`。

## 访问权限

登录已改为云端账号密码校验，并按公司、角色和权限隔离数据。

接口：

```text
POST /api/access
GET /api/access
GET /api/operation-logs
POST /api/orders/:id/void
```

说明：

- `GET /api/orders` 和 `POST /api/orders` 需要携带账号密码登录后返回的 Bearer token。
- 员工可以按分配权限查看、新增和编辑工单，并将工单推进到完工状态。
- 结算、返结算、导出、账号权限管理和其他管理操作仅管理员可用。
- 作废不会物理删除数据，工单会标记为 `voided = 1` 并保留操作日志。

## 第一次部署前

如果命令行提示没有登录 Cloudflare，先执行：

```bash
npx wrangler login
```

登录完成后再执行：

```bash
npm run deploy
```
