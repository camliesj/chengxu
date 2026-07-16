# 最新接力提示词

继续开发 `https://github.com/camliesj/chengxu.git`。

当前工作分支：`codex/android-mobile-ui-atlas`  
UI 图集基线提交：`28ab718`（后续接力时先执行 `git pull`，以远程最新提交为准）

已完成 Android 移动端导航方案 A 的完整 UI 设计原型，尚未开始 Android 生产客户端编码。设计原型位于 `design/mobile-ui/`，交付说明位于 `docs/mobile-ui-atlas.md`。已生成 22 张 390×844 单屏 PNG 和 4 张总览图，覆盖登录、员工/管理员工作台、当前工单、筛选、员工/管理员详情、新增四步、编辑、状态确认、结算、回执、返结算、客户车辆档案、车辆保险、维修历史、我的、断网只读和系统状态。

已确认权限：员工可将工单推进到待结算，但不可结算、返结算、作废或维护到账回执；管理员拥有上述高权限操作。已结算工单进入维修历史，未结算工单保留在当前工单。离线时只允许查看缓存数据。

最新验证结果：

- 移动 UI 目录测试：3/3 通过
- Playwright 移动 UI 与截图测试：79/79 通过
- 现有业务 Node 测试：64/64 通过
- `npm.cmd run build`：通过
- PNG 数量：22 张单屏 + 4 张总览

下一步建议：先由用户审阅 `design/mobile-ui/output/atlas-*.png`，确认后以该图集为唯一视觉基准，开始搭建 Android 生产客户端壳层、路由和设计系统，再依次接入登录、工作台、工单、档案和我的模块。不要直接修改网页端布局来模拟移动端，也不要接入真实 API/COS，直到 Android 壳层和前两组页面通过视觉验收。

常用命令：

```powershell
npm.cmd run design:mobile
npm.cmd run test:mobile-ui
npm.cmd test
npm.cmd run build
```
