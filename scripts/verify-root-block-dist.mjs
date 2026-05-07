import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
process.env.BLOCK_DIST_DIR = resolve(__dirname, "..", "dist");
await import("../plugin-center/sidebar-plugin/scripts/verify-block-dist.mjs");
