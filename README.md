# 飞书多维表对账插件（智序对账）

面向飞书插件中心提报的 **多维表边栏插件（offlineWeb）** 仓库。业务功能：销售/收款、采购/付款场景下的字段读取、明细对账、Excel/CSV 导出与对账单版式图。

## 飞书提报要求的目录结构

| 路径 | 说明 |
|------|------|
| [`plugin-center/sidebar-plugin/`](plugin-center/sidebar-plugin/) | **上架版前端**：`package.json`、`src/`、`scripts/`、飞书清单 `block.json` / `index.json` / `app.json` / `project.config.json` |
| [`plugin-center/sidebar-plugin/dist/`](plugin-center/sidebar-plugin/dist/) | **`npm run build:block` 构建产物**：入口 **`index.html`** 与 `app.js`、`app.css`、清单副本同级（记录视图容器要求） |
| [`plugin-center/sidebar-plugin/docs/feishu-submission-checklist.md`](plugin-center/sidebar-plugin/docs/feishu-submission-checklist.md) | 上架自检清单 |

所有开发、构建、`opdev upload` 均在 **`plugin-center/sidebar-plugin`** 目录下执行。

```bash
cd plugin-center/sidebar-plugin
npm install
npm run build:block
npm run verify:block-dist
```

详细说明见 [`plugin-center/sidebar-plugin/README.md`](plugin-center/sidebar-plugin/README.md)。

## Vercel（网页托管）

构建配置在 **仓库根目录** 的 **`vercel.json`**（安装与构建会进入 `plugin-center/sidebar-plugin` 执行 `build:block`，产物为 `plugin-center/sidebar-plugin/dist`）。

**推荐**：Vercel 项目 **Settings → General → Root Directory 留空**（使用仓库根），与根目录 `vercel.json` 一致；推送 `main` 后自动部署 **`https://plugin.zxaigc.online`**。

若将 Root Directory 设为 **`plugin-center/sidebar-plugin`**，则会使用该子目录内的 `vercel.json`（另一套等价配置），**勿与「根目录 + 再填子目录」叠加**，否则会路径重复导致构建失败。

## 参考示例仓库说明

若对照 [`feishu-bitable-reconcile`](https://github.com/leke1122/feishu-bitable-reconcile) 类模板：典型要求为 **静态入口 `dist/index.html`**、相对路径资源、`block.json` / `index.json` 与插件类型一致；本仓库以上条目由 `build:block` + `verify:block-dist` 强制校验。
