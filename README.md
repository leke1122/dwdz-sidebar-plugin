# Sidebar Plugin Submission Build

这个子项目用于生成符合飞书多维表“边栏插件共享提报”要求的前端静态产物：

- 构建产物目录：`dist`
- 资源引用路径：相对路径（`base: "./"`）
- 不使用 history 路由（单页无路由）
- 后端地址可配置：`VITE_API_BASE_URL`

## 本地运行

```bash
cd plugin-center/sidebar-plugin
npm install
copy .env.example .env
npm run dev
```

## 打包提报

```bash
npm run build:block
npm run verify:block-dist
# 仅允许上传 dist 目录
opdev upload ./dist -t block -p pc -v <version> -d "<description>"
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

`VITE_API_BASE_URL` 指向你的对账后端（当前建议使用 `E:/dwdz` 部署出的服务）：

- `GET /api/get-table-fields`
- `POST /api/generate-reconciliation`
- `GET /api/export-file`
- `POST /api/validate-activation-code`

