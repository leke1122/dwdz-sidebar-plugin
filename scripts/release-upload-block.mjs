import { spawnSync } from "node:child_process";
import { readPluginVersion } from "./plugin-version.mjs";

function run(cmd, args) {
  const r = spawnSync(cmd, args, {
    stdio: "inherit",
    shell: true,
    cwd: process.cwd(),
  });
  return (r.status ?? 1) === 0;
}

const version = await readPluginVersion();
if (!version) {
  console.error("Missing PLUGIN_BUILD_VERSION in src/version.ts");
  process.exit(1);
}

console.log(`Using PLUGIN_BUILD_VERSION=${version} for opdev -v (must match src/version.ts).`);

if (!run("npm", ["run", "build:block"])) process.exit(1);
if (!run("npm", ["run", "verify:block-dist"])) process.exit(1);

const ok = run("opdev", [
  "upload",
  "./dist",
  "-t",
  "block",
  "-p",
  "pc",
  "-v",
  version,
  "-d",
  `Release ${version} (opdev version = PLUGIN_BUILD_VERSION)`,
]);

process.exit(ok ? 0 : 1);
