import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const WEB_URL = "https://plugin.zxaigc.online";
const API_URL = "https://api.zxaigc.online/api/health";

function pickVersionFromSource(source) {
  const m = source.match(/PLUGIN_BUILD_VERSION\s*=\s*"([^"]+)"/);
  return m?.[1] ?? "";
}

function pickJsPathFromHtml(html) {
  const mBlock = html.match(/<script[^>]+src="([^"]*app\.js)"/i);
  if (mBlock?.[1]) return mBlock[1];
  const mApp = html.match(/<script[^>]+src="([^"]+app-[^"]+\.js)"/i);
  if (mApp?.[1]) return mApp[1];
  const mVite = html.match(/<script[^>]+src="([^"]+assets\/index-[^"]+\.js)"/i);
  return mVite?.[1] ?? "";
}

function pickVersionFromBundle(js) {
  const m0 = js.match(/__DWDZ_PLUGIN_VERSION__\s*=\s*"([^"]+)"/);
  if (m0?.[1]) return m0[1];
  const m = js.match(/var\s+PLUGIN_BUILD_VERSION\s*=\s*"([^"]+)"/);
  if (m?.[1]) return m[1];
  const m2 = js.match(/PLUGIN_BUILD_VERSION\s*=\s*"([^"]+)"/);
  return m2?.[1] ?? "";
}

function toAbsolute(base, maybeRelative) {
  if (!maybeRelative) return "";
  if (/^https?:\/\//i.test(maybeRelative)) return maybeRelative;
  return `${base.replace(/\/$/, "")}/${maybeRelative.replace(/^\.\//, "")}`;
}

function basename(urlOrPath) {
  const clean = String(urlOrPath || "").split("?")[0].split("#")[0];
  const parts = clean.split("/");
  return parts[parts.length - 1] || "";
}

async function main() {
  const versionPath = resolve("src/version.ts");
  const versionSource = await readFile(versionPath, "utf8");
  const localVersion = pickVersionFromSource(versionSource);
  if (!localVersion) {
    throw new Error("未在 src/version.ts 发现 PLUGIN_BUILD_VERSION。");
  }

  const localHtml = await readFile(resolve("dist/index.html"), "utf8");
  const localJsPath = pickJsPathFromHtml(localHtml);
  const localJsAsset = basename(localJsPath);

  const webHtmlResp = await fetch(WEB_URL, { redirect: "follow" });
  const webHtml = await webHtmlResp.text();
  const jsPath = pickJsPathFromHtml(webHtml);
  const jsUrl = toAbsolute(WEB_URL, jsPath);
  if (!jsUrl) {
    throw new Error("线上首页未找到 app.js / app-*.js / assets/index-*.js 脚本路径。");
  }

  const webJsResp = await fetch(jsUrl, { redirect: "follow" });
  const webJs = await webJsResp.text();
  const webVersion = pickVersionFromBundle(webJs);
  const webJsAsset = basename(jsUrl);

  const apiResp = await fetch(API_URL, { redirect: "follow" });
  const apiText = await apiResp.text();

  const result = {
    ok: apiResp.ok && (webVersion ? webVersion === localVersion : webJsAsset === localJsAsset),
    localVersion,
    webVersion: webVersion || "UNKNOWN",
    localJsAsset,
    webJsAsset,
    webAsset: jsUrl,
    apiHealthStatus: apiResp.status,
    apiHealthBody: apiText.slice(0, 200),
    checks: {
      versionMatch: webVersion ? webVersion === localVersion : webJsAsset === localJsAsset,
      apiHealthy: apiResp.ok,
    },
  };

  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
