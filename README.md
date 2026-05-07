# 飞书多维表对账插件（智序对账）

面向飞书插件中心提报的 **多维表边栏插件（offlineWeb）** 仓库。业务功能：销售/收款、采购/付款场景下的字段读取、明细对账、Excel/CSV 导出与对账单版式图。

**仓库根目录 `package.json`**：满足飞书审核「根路径可读 `package.json`」且包含 **`"output": "dist"`**。在仓库根执行 **`npm run build`** 会在子目录打包并把 **`dist/` 同步到仓库根**，供审核与 **`opdev upload ./dist`** 使用（等同官方文档要求）。

## 飞书提报要求的目录结构

| 路径 | 说明 |
|------|------|
| [`package.json`](package.json)（根目录） | 含 **`output: "dist"`**；`npm run build` / `build:block` 会产出并校验根目录 `dist/` |
| [`dist/`](dist/)（根目录） | **飞书审核用静态包**（`build:block` 后从子目录同步）：入口 **`index.html`** 与 `app.js`、`app.css`、清单副本同级，资源为相对路径 |
| [`plugin-center/sidebar-plugin/`](plugin-center/sidebar-plugin/) | **上架版前端源码**：`package.json`（含 `output: "dist"` 指向子目录构建输出）、`src/`、`scripts/`、飞书清单 |
| [`plugin-center/sidebar-plugin/docs/feishu-submission-checklist.md`](plugin-center/sidebar-plugin/docs/feishu-submission-checklist.md) | 上架自检清单 |

日常开发可在子目录执行；**对齐官方仓库检查时建议在仓库根执行**：

```bash
npm install
npm run build
```

上传小组件包（在仓库根，与 `-v` 一致）：

```bash
npm run release:upload:block
```

仍可在 `plugin-center/sidebar-plugin` 下本地 `npm run dev` / `build:block`；每次成功构建会自动尝试同步到根目录 `dist/`（完整克隆本仓库时）。

详细说明见 [`plugin-center/sidebar-plugin/README.md`](plugin-center/sidebar-plugin/README.md)。

## Vercel（网页托管）

构建配置在 **仓库根目录** 的 **`vercel.json`**（安装与构建在子目录执行 `build:block` 后校验 **根目录 `dist/`** 为 `outputDirectory`）。

**推荐**：Vercel 项目 **Settings → General → Root Directory 留空**（使用仓库根），与根目录 `vercel.json` 一致；推送 `main` 后自动部署 **`https://plugin.zxaigc.online`**。

若将 Root Directory 设为 **`plugin-center/sidebar-plugin`**，则会使用该子目录内的 `vercel.json`（另一套等价配置），**勿与「根目录 + 再填子目录」叠加**，否则会路径重复导致构建失败。

## 参考示例仓库说明

若对照 [`feishu-bitable-reconcile`](https://github.com/leke1122/feishu-bitable-reconcile) 类模板：典型要求为 **静态入口 `dist/index.html`**、相对路径资源、`block.json` / `index.json` 与插件类型一致；本仓库以上条目由 `build:block` + `verify:block-dist` 强制校验。
