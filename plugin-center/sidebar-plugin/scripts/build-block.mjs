import { build } from "esbuild";
import { copyFile, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
import { readPluginVersion } from "./plugin-version.mjs";

const outDir = resolve("dist");
const buildVersion = (await readPluginVersion()) || "unknown";

await mkdir(outDir, { recursive: true });
const oldFiles = await readdir(outDir).catch(() => []);
for (const f of oldFiles) {
  await rm(resolve(outDir, f), { force: true, recursive: true });
}

const outJs = resolve(outDir, "app.js");
await build({
  entryPoints: [resolve("src/main.tsx")],
  bundle: true,
  format: "iife",
  target: "es2015",
  outfile: outJs,
  write: true,
  minify: true,
  loader: {
    ".ts": "ts",
    ".tsx": "tsx",
    ".css": "css",
  },
});

const html = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>智序对账插件</title>
    <link rel="stylesheet" href="./app.css" />
  </head>
  <body>
    <div id="root">正在加载智序对账插件 v${buildVersion}...</div>
    <script src="./app.js"></script>
  </body>
</html>
`;

await writeFile(resolve(outDir, "index.html"), html, "utf8");

const manifestFiles = ["block.json", "index.json", "app.json", "project.config.json"];
for (const file of manifestFiles) {
  const src = resolve(file);
  const dst = resolve(outDir, file);
  try {
    await copyFile(src, dst);
  } catch {
    // Ignore optional files that are not present.
  }
}

const repoRootSyncScript = resolve(__dirname, "../../../scripts/sync-root-dist.mjs");
try {
  await import(pathToFileURL(repoRootSyncScript).href);
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  console.warn(
    `[build:block] Optional sync to repo-root dist/ skipped (${msg}). Full clone of dwdz-sidebar-plugin should include scripts/sync-root-dist.mjs.`,
  );
}
