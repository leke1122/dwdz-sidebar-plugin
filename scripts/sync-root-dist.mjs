import { cp, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const src = resolve(repoRoot, "plugin-center/sidebar-plugin/dist");
const dst = resolve(repoRoot, "dist");

await rm(dst, { recursive: true, force: true });
await cp(src, dst, { recursive: true });
console.log(`Synced block dist: ${src} -> ${dst}`);
