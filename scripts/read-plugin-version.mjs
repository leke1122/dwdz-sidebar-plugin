import { readPluginVersion } from "./plugin-version.mjs";

const v = await readPluginVersion();
if (!v) {
  console.error("Missing PLUGIN_BUILD_VERSION in src/version.ts");
  process.exit(1);
}
console.log(v);
