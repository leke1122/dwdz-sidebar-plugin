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

若将 **本仓库** 接入 Vercel，请在项目设置中将 **Root Directory** 设为 **`plugin-center/sidebar-plugin`**，以便读取该目录下的 `vercel.json` 并执行 `build:block`。本地 CLI 也请在同一子目录下运行 `npx vercel`。

## 参考示例仓库说明

若对照 [`feishu-bitable-reconcile`](https://github.com/leke1122/feishu-bitable-reconcile) 类模板：典型要求为 **静态入口 `dist/index.html`**、相对路径资源、`block.json` / `index.json` 与插件类型一致；本仓库以上条目由 `build:block` + `verify:block-dist` 强制校验。
