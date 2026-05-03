# 双端同步发布规范（网页 + 飞书记录视图）

## 目标

确保以下两个入口始终同版本：

- 网页：`https://plugin.zxaigc.online`
- 飞书：多维表记录详情（记录视图小组件）

## 单一真源

- 前端唯一发布源：Git 仓库内 `plugin-center/sidebar-plugin`
- 禁止从其他目录发布前端包
- **插件对外版本号只认一处**：`src/version.ts` 里的 `PLUGIN_BUILD_VERSION`。改版本只改这里；`package.json` 的 `version` 与之保持同步，便于扫一眼仓库。

## 发布前

1. 在 `src/version.ts` 更新 `PLUGIN_BUILD_VERSION`（并同步把根目录 `package.json` 的 `version` 改成相同 semver）
2. 执行：
   - 网页与 Vercel：推送 Git 后由 `vercel.json` 的 `buildCommand` 执行 `build:block`（本地可 `npm run build:block` 预检）
3. 执行自检：
   - `npm run self-check`

## 发布流程（必须两条链路都执行）

### A. 网页链路

1. `npx vercel --prod --yes --force`
2. `npx vercel alias set <deployment-url> plugin.zxaigc.online`
3. 再跑一次 `npm run self-check`，确认 `versionMatch: true`

### B. 飞书记录视图链路

1. **必须**使用（避免手填 `-v` 与源码不一致）：
   - `npm run release:upload:block`  
   该命令会：`build:block` → `verify:block-dist` → `opdev upload … -v <与 PLUGIN_BUILD_VERSION 相同>`
2. 若需只查看当前版本号：`npm run release:version`
4. 飞书开放平台切记录视图到新版本并发布应用版本
5. 飞书客户端删除旧插件实例后重新添加验证

## 审核要求约束

- 仅保留“记录视图”能力链路
- 数据表视图能力不作为生产入口
- 页面需展示隐私政策/服务条款链接
