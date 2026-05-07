import { execSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readPluginVersion } from "../plugin-center/sidebar-plugin/scripts/plugin-version.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const pluginDir = resolve(root, "plugin-center/sidebar-plugin");
const version = await readPluginVersion(pluginDir);
if (!version) {
  console.error("Missing PLUGIN_BUILD_VERSION in plugin-center/sidebar-plugin/src/version.ts");
  process.exit(1);
}
console.log(`Using PLUGIN_BUILD_VERSION=${version} for opdev -v (must match src/version.ts).`);
execSync("npm run build", { stdio: "inherit", cwd: root, shell: true, windowsHide: true });
const desc = `Release ${version} aligned with src version.ts`;
execSync(`opdev upload ./dist -t block -p pc -v ${version} -d ${JSON.stringify(desc)}`, {
  stdio: "inherit",
  cwd: root,
  shell: true,
  windowsHide: true,
});
