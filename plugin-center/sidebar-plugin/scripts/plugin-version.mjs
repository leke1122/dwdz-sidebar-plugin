import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

/**
 * Single source of truth: src/version.ts → PLUGIN_BUILD_VERSION
 * Used by build:block, release scripts, and read-plugin-version CLI.
 */
export async function readPluginVersion(cwd = process.cwd()) {
  const source = await readFile(resolve(cwd, "src/version.ts"), "utf8");
  const m = source.match(/PLUGIN_BUILD_VERSION\s*=\s*"([^"]+)"/);
  return m?.[1] ?? "";
}
