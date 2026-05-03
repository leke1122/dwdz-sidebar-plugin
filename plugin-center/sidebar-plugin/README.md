# Sidebar Plugin Submission Build

这个子项目用于生成符合飞书多维表“边栏插件共享提报”要求的前端静态产物：

- 构建产物目录：`dist`
- 资源引用路径：相对路径（`base: "./"`）
- 不使用 history 路由（单页无路由）
- 后端地址可配置：`VITE_API_BASE_URL`

## 本地运行

在 **本目录**（`plugin-center/sidebar-plugin`）执行：

```bash
npm install
copy .env.example .env
npm run dev
```

## 版本号

**只改 `src/version.ts` 里的 `PLUGIN_BUILD_VERSION`**（并与根目录 `package.json` 的 `version` 保持一致）。网页标题、加载页、小组件 UI、`opdev -v` 均依赖这一处。

- 查看当前发布号：`npm run release:version`

## 打包提报

```bash
# 推荐：构建 + 校验 + 上传（-v 自动等于 PLUGIN_BUILD_VERSION，避免版本漂移）
npm run release:upload:block
```

手动分步（不推荐，易与源码版本号不一致）：

```bash
npm run build:block
npm run verify:block-dist
opdev upload ./dist -t block -p pc -v <必须与 src/version.ts 一致> -d "<description>"
```

注意：`index.html` 必须位于 `dist` 根目录（与 `app.js`/`app.css` 同级），否则飞书记录视图容器无法加载。

## 发布后自检

```bash
npm run self-check
```

自检会输出：

- 本地代码版本（`PLUGIN_BUILD_VERSION`）
- `plugin.zxaigc.online` 实际线上版本
- `api.zxaigc.online/api/health` 状态

若版本不一致或 API 不健康，自检会返回非 0 退出码，便于在发布流程中阻断。

## 发布规范（强制）

见 `RELEASE_POLICY.md`，按“网页链路 + 飞书记录视图链路”双发布执行，避免版本漂移。

## 对接后端

`VITE_API_BASE_URL`（默认见 `src/App.tsx`）指向智序对账 API，核心路由示例：

- `GET /api/get-app-tables`
- `GET /api/get-table-fields`
- `POST /api/customer-options`
- `POST /api/generate-ledger`
- `GET /api/export-ledger-file`
- `POST /api/validate-activation-code`
- `GET /api/quota-logs`

