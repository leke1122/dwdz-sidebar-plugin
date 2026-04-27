import { build } from "esbuild";
import { copyFile, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const outDir = resolve("dist");
const versionSource = await readFile(resolve("src/version.ts"), "utf8");
const versionMatch = versionSource.match(/PLUGIN_BUILD_VERSION\s*=\s*"([^"]+)"/);
const buildVersion = versionMatch?.[1] ?? "unknown";

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
