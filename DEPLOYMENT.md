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

## 第一次部署前

如果命令行提示没有登录 Cloudflare，先执行：

```bash
npx wrangler login
```

登录完成后再执行：

```bash
npm run deploy
```
