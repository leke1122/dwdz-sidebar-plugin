import { execSync, spawnSync } from "node:child_process";
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

// One shell line + JSON.stringify(-d) so Windows cmd parses argv like a human terminal.
const desc = `Release ${version} aligned with src version.ts`;
let ok = false;
try {
  execSync(`opdev upload ./dist -t block -p pc -v ${version} -d ${JSON.stringify(desc)}`, {
    stdio: "inherit",
    cwd: process.cwd(),
    shell: true,
    windowsHide: true,
  });
  ok = true;
} catch {
  ok = false;
}

process.exit(ok ? 0 : 1);
