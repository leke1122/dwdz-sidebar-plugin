# 飞书多维表边栏插件上架自检清单

对照开放平台「offlineWeb / 边栏插件」提报与 [`README.md`](../README.md) 中的构建说明，发布或提交 GitHub 审核前逐项确认。

## 1. 仓库目录（插件中心口径）

- [ ] 上架源码位于 **`plugin-center/sidebar-plugin/`**（本仓库约定路径）。
- [ ] **仓库根目录存在可解析的 `package.json`**（飞书等自动部署在克隆后读取根路径 `package.json`；根目录 `npm run build` 会代理到子目录构建）。
- [ ] 静态构建产物位于 **`plugin-center/sidebar-plugin/dist/`**，且 **入口文件为 `dist/index.html`**（与 `app.js`、`app.css` 同级，相对路径 `./app.js`、`./app.css`）。
- [ ] 仓库根 [`README.md`](../../../README.md) 已说明上述路径，便于审核人员导航。

## 2. 构建与校验命令

在 `plugin-center/sidebar-plugin` 下执行：

```bash
npm ci
npm run build:block
npm run verify:block-dist
```

- [ ] `verify:block-dist` 通过（校验 `dist/index.html`、`app.js`、`app.css`、`index.json`、`block.json`、`app.json`、`project.config.json` 存在）。
- [ ] `dist/` 内清单与根目录一致：`block.json`、`index.json`、`app.json`、`project.config.json`（由 `build:block` 复制）。

## 3. 版本号一致

- [ ] `src/version.ts` 中 `PLUGIN_BUILD_VERSION` 与 `package.json` 的 `version` 一致。
- [ ] `opdev upload` 使用的 `-v` 与上述版本一致（推荐使用 `npm run release:upload:block`，避免手填漂移）。

## 4. 功能与合规（摘要）

- [ ] 插件内展示隐私政策与服务条款链接（指向后端 `GET /legal/privacy`、`GET /legal/terms`）。
- [ ] 无违反提报口径的收款跳转或未授权数据采集说明（提报文案按开放平台要求自检）。

## 5. 用户反馈（帮助文档 / 上架常见要求）

- [ ] 插件内提供 **飞书用户交流群** 入口（「使用说明」「设置」及页脚链接），用于问题反馈与使用交流。
- [ ] 加群链接（与 `src/App.tsx` 中 `FEISHU_USER_FEEDBACK_GROUP_URL` 保持一致，须为长期有效邀请）：  
  `https://applink.feishu.cn/client/chat/chatter/add_by_link?link_token=774oc993-d1bb-4eee-9d60-4d7d26853e78`  
  若群链接失效，需同步更新源码常量并重新发版。

## 6. Git 提交建议

- [ ] **`dist/` 已随源码提交**（本目录 `.gitignore` 已不再忽略 `dist/`，便于审核方直接查看上架包结构）。
- [ ] 未将 `node_modules/`、`.vercel` 或 `dist-web/` 误提交。

## 7. 与参考模板仓库的差异说明

若对照社区示例仓库（如 `feishu-bitable-reconcile` 类项目）：不同应用 `appId` / `blockTypeID` 以本仓库 `app.json`、`block.json` 为准；**结构要求上一致：静态入口在 `dist/index.html`，资源为相对引用。**

完成以上项后，可将本仓库地址填入飞书提报表单「项目地址（GitHub）」。
