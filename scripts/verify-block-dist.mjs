import { access } from "node:fs/promises";
import { resolve } from "node:path";

const requiredFiles = [
  "index.html",
  "app.js",
  "app.css",
  "index.json",
  "block.json",
];

async function main() {
  const distDir = resolve("dist");
  const missing = [];

  for (const file of requiredFiles) {
    const fullPath = resolve(distDir, file);
    try {
      await access(fullPath);
    } catch {
      missing.push(`dist/${file}`);
    }
  }

  if (missing.length > 0) {
    console.error("Block package verification failed. Missing files:");
    for (const file of missing) {
      console.error(`- ${file}`);
    }
    console.error("Run `npm run build:block` and upload from `./dist` only.");
    process.exit(1);
  }

  console.log("Block package verification passed.");
  console.log("Use: opdev upload ./dist -t block -p pc -v <version> -d \"...\"");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
