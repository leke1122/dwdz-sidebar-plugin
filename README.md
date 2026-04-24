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
npm run build
```

将 `dist` 与本目录的 `package.json`（含 `output: "dist"`）一起提交到飞书共享表单要求的代码仓库中。

## 对接后端

`VITE_API_BASE_URL` 指向你的对账后端（当前建议使用 `E:/dwdz` 部署出的服务）：

- `GET /api/get-table-fields`
- `POST /api/generate-reconciliation`
- `GET /api/export-file`
- `POST /api/validate-activation-code`

