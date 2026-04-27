import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";
import { DIAG_MINIMAL_BOOT, PLUGIN_BUILD_VERSION } from "./version";

declare global {
  interface Window {
    __DWDZ_PLUGIN_VERSION__?: string;
    __DWDZ_BOOTED__?: boolean;
  }
}

// Startup marker for record-detail container diagnostics.
window.__DWDZ_BOOTED__ = true;
window.__DWDZ_PLUGIN_VERSION__ = PLUGIN_BUILD_VERSION;
const bootHost = document.getElementById("root");
if (bootHost && /正在加载/.test(bootHost.textContent || "")) {
  bootHost.textContent = `脚本已执行，正在初始化 v${PLUGIN_BUILD_VERSION}...`;
}

function renderFatal(message: string) {
  const host = document.getElementById("root") || document.body;
  if (!host) return;
  const w = window as Window & { feishu?: unknown; tt?: unknown };
  const env = {
    ua: navigator.userAgent,
    hasFeishu: Boolean(w.feishu),
    hasTT: Boolean(w.tt),
    href: window.location.href,
  };
  host.innerHTML =
    `<div style="padding:12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">` +
    `<h3 style="margin:0 0 8px;">插件初始化失败</h3>` +
    `<pre style="white-space:pre-wrap;word-break:break-word;background:#fff5f5;border:1px solid #fecaca;padding:8px;border-radius:6px;">${message}</pre>` +
    `<pre style="white-space:pre-wrap;word-break:break-word;background:#f8fafc;border:1px solid #e2e8f0;padding:8px;border-radius:6px;margin-top:8px;">${JSON.stringify(
      env
    )}</pre>` +
    `</div>`;
}

window.addEventListener("error", (event) => {
  renderFatal(event.error?.stack || event.message || "unknown error");
});

window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  const msg =
    typeof reason === "string"
      ? reason
      : reason?.stack || reason?.message || JSON.stringify(reason ?? "unknown rejection");
  renderFatal(msg);
});

try {
  const root = document.getElementById("root");
  if (!root) throw new Error("Root element #root not found");
  if (DIAG_MINIMAL_BOOT) {
    const w = window as Window & { feishu?: unknown; tt?: unknown };
    root.innerHTML =
      `<div style="padding:12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">` +
      `<h3 style="margin:0 0 8px;">记录详情容器启动检测通过</h3>` +
      `<div>版本：v${PLUGIN_BUILD_VERSION}</div>` +
      `<div style="margin-top:6px;">该版本用于定位“记录详情无法加载”问题，已确认脚本可执行。</div>` +
      `<pre style="white-space:pre-wrap;word-break:break-word;background:#f8fafc;border:1px solid #e2e8f0;padding:8px;border-radius:6px;margin-top:8px;">${JSON.stringify(
        {
          href: window.location.href,
          ua: navigator.userAgent,
          hasFeishu: Boolean(w.feishu),
          hasTT: Boolean(w.tt),
        },
        null,
        2
      )}</pre>` +
      `</div>`;
  } else {
  createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  }
} catch (error) {
  const message =
    error instanceof Error ? error.stack || error.message : typeof error === "string" ? error : "unknown error";
  renderFatal(message);
}

