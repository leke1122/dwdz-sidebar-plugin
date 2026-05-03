import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    /** 与飞书上架包 `dist/` 分离，避免误执行 `vite build` 覆盖 `build:block` 产物 */
    outDir: "dist-web",
    sourcemap: false,
    target: "es2015",
  },
});

