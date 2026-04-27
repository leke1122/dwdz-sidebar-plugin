# 双端同步发布规范（网页 + 飞书记录视图）

## 目标

确保以下两个入口始终同版本：

- 网页：`https://plugin.zxaigc.online`
- 飞书：多维表记录详情（记录视图小组件）

## 单一真源

- 前端唯一发布源：`dwdz-sidebar-plugin-temp`
- 禁止从其他目录发布前端包

## 发布前

1. 在 `src/version.ts` 更新 `PLUGIN_BUILD_VERSION`
2. 执行：
   - `npm run build`
   - `npm run build:block`
3. 执行自检：
   - `npm run self-check`

## 发布流程（必须两条链路都执行）

### A. 网页链路

1. `npx vercel --prod --yes --force`
2. `npx vercel alias set <deployment-url> plugin.zxaigc.online`
3. 再跑一次 `npm run self-check`，确认 `versionMatch: true`

### B. 飞书记录视图链路

1. `npm run build:block`
2. `npm run verify:block-dist`
3. `opdev upload ./dist -t block -p pc -v <version> -d "<description>"`
4. 飞书开放平台切记录视图到新版本并发布应用版本
5. 飞书客户端删除旧插件实例后重新添加验证

## 审核要求约束

- 仅保留“记录视图”能力链路
- 数据表视图能力不作为生产入口
- 页面需展示隐私政策/服务条款链接
