import { useEffect, useMemo, useState } from "react";
import { PLUGIN_BUILD_VERSION } from "./version";

type ViewTab = "main" | "guide" | "settings";
type FieldOption = { id: string; name: string; type: number };
type TableOption = { id: string; name: string };
type Row = { customerName: string; salesAmount: number; paymentAmount: number; diffAmount: number };

type PluginContext = { appToken: string; tableId: string; userOpenId: string };
type Lang = "zh-CN" | "en-US";
type LoadStats = { business: number; settlement: number; total: number };
type LedgerRow = Record<string, string | number>;
type QuotaLogItem = {
  action: "ACTIVATE" | "GENERATE_LEDGER" | "GENERATE_SUMMARY" | string;
  deltaQuota: number;
  remainingQuota: number;
  detail: string;
  createdAt: string;
};

const viteEnv =
  typeof import.meta !== "undefined" && (import.meta as { env?: Record<string, string | undefined> }).env
    ? (import.meta as { env?: Record<string, string | undefined> }).env!
    : {};
const API_BASE = (viteEnv.VITE_API_BASE_URL || "https://api.zxaigc.online").replace(/\/$/, "");
const TEST_DEFAULTS = {
  appToken: "TBU4buNX3acSVzs8M5FcN168nAc",
  businessTableId: "tblTuBqWx31grIHS",
  settlementTableId: "tblS7mZNU0Kd9h2S",
};

const I18N: Record<
  Lang,
  {
    title: string;
    readFields: string;
    generate: string;
    quota: string;
    activationRequired: string;
    activationPlaceholder: string;
    activate: string;
    exportExcel: string;
    exportCsv: string;
    privacy: string;
    terms: string;
    fieldsLoaded: string;
    envNotReady: string;
    envReady: string;
  }
> = {
  "zh-CN": {
    title: "智序对账插件（上架版）",
    readFields: "读取字段",
    generate: "生成对账",
    quota: "剩余次数",
    activationRequired: "免费次数已用完，请输入激活码。",
    activationPlaceholder: "输入激活码",
    activate: "激活",
    exportExcel: "导出Excel",
    exportCsv: "导出CSV",
    privacy: "隐私政策",
    terms: "服务条款",
    fieldsLoaded: "已读取字段数",
    envNotReady: "未检测到飞书插件上下文，请从多维表插件侧栏打开。",
    envReady: "已自动读取飞书上下文。",
  },
  "en-US": {
    title: "Zhixu Reconciliation Plugin (Submission Build)",
    readFields: "Load Fields",
    generate: "Generate Reconciliation",
    quota: "Remaining Quota",
    activationRequired: "Free quota exhausted. Please input activation code.",
    activationPlaceholder: "Activation code",
    activate: "Activate",
    exportExcel: "Export Excel",
    exportCsv: "Export CSV",
    privacy: "Privacy Policy",
    terms: "Terms of Service",
    fieldsLoaded: "Loaded fields",
    envNotReady: "Feishu plugin context not found. Open inside Bitable sidebar plugin.",
    envReady: "Feishu plugin context loaded.",
  },
};

function api(path: string): string {
  return `${API_BASE}${path}`;
}

function pick(input: unknown): string {
  return typeof input === "string" ? input.trim() : "";
}

function fromUrl(): Partial<PluginContext> {
  if (typeof window === "undefined") return {};
  const url = new URL(window.location.href);
  const params = new URLSearchParams(url.search);
  const hash = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
  const hashParams = new URLSearchParams(hash.includes("?") ? hash.split("?")[1] : hash);
  const read = (...keys: string[]) => {
    for (const key of keys) {
      const value = pick(params.get(key)) || pick(hashParams.get(key));
      if (value) return value;
    }
    return "";
  };
  return {
    appToken: read("appToken", "app_token", "baseToken", "base_token"),
    tableId: read("tableId", "table_id"),
    userOpenId: read("openId", "open_id", "userId", "user_id", "larkUserId", "lark_user_id"),
  };
}

async function readContext(): Promise<PluginContext | null> {
  const w = window as Window & {
    feishu?: {
      appToken?: string;
      baseToken?: string;
      tableId?: string;
      openId?: string;
      userId?: string;
      getContext?: () => Promise<Record<string, unknown>>;
    };
    tt?: {
      getEnvInfo?: ((arg?: unknown) => Promise<Record<string, unknown>> | void) | undefined;
      getContext?: ((arg?: unknown) => Promise<Record<string, unknown>> | void) | undefined;
    };
  };
  async function callSdk(
    fn?: ((arg?: unknown) => Promise<Record<string, unknown>> | void) | undefined
  ): Promise<Record<string, unknown> | null> {
    if (!fn) return null;
    try {
      const maybe = fn();
      if (maybe && typeof (maybe as Promise<Record<string, unknown>>).then === "function") {
        return (await maybe) as Record<string, unknown>;
      }
    } catch {
      // try callback mode
    }
    try {
      return await new Promise<Record<string, unknown> | null>((resolve) => {
        let done = false;
        const finish = (value: Record<string, unknown> | null) => {
          if (done) return;
          done = true;
          resolve(value);
        };
        fn({
          success: (res: Record<string, unknown>) => finish(res),
          fail: () => finish(null),
        });
        setTimeout(() => finish(null), 1200);
      });
    } catch {
      return null;
    }
  }


  const urlCtx = fromUrl();
  let appToken = pick(w.feishu?.appToken) || pick(w.feishu?.baseToken) || pick(urlCtx.appToken);
  let tableId = pick(w.feishu?.tableId) || pick(urlCtx.tableId);
  let userOpenId = pick(w.feishu?.openId) || pick(w.feishu?.userId) || pick(urlCtx.userOpenId);

  if ((!appToken || !tableId || !userOpenId) && w.feishu?.getContext) {
    try {
      const ctx = await w.feishu.getContext();
      appToken =
        appToken ||
        pick(ctx.appToken) ||
        pick(ctx.baseToken) ||
        pick((ctx as { bitable?: { appToken?: string; baseToken?: string } }).bitable?.appToken) ||
        pick((ctx as { bitable?: { appToken?: string; baseToken?: string } }).bitable?.baseToken);
      tableId = tableId || pick(ctx.tableId) || pick((ctx as { bitable?: { tableId?: string } }).bitable?.tableId);
      userOpenId =
        userOpenId ||
        pick(ctx.openId) ||
        pick(ctx.userId) ||
        pick((ctx as { user?: { openId?: string; userId?: string } }).user?.openId) ||
        pick((ctx as { user?: { openId?: string; userId?: string } }).user?.userId);
    } catch {
      // ignore
    }
  }

  if ((!appToken || !tableId || !userOpenId) && (w.tt?.getEnvInfo || w.tt?.getContext)) {
    try {
      const env = (await callSdk(w.tt?.getContext)) || (await callSdk(w.tt?.getEnvInfo)) || {};
      appToken =
        appToken ||
        pick(env.appToken) ||
        pick(env.baseToken) ||
        pick((env as { bitable?: { appToken?: string; baseToken?: string } }).bitable?.appToken) ||
        pick((env as { bitable?: { appToken?: string; baseToken?: string } }).bitable?.baseToken);
      tableId = tableId || pick(env.tableId) || pick((env as { bitable?: { tableId?: string } }).bitable?.tableId);
      userOpenId =
        userOpenId ||
        pick(env.openId) ||
        pick(env.userId) ||
        pick((env as { user?: { openId?: string; userId?: string } }).user?.openId) ||
        pick((env as { user?: { openId?: string; userId?: string } }).user?.userId);
    } catch {
      // ignore
    }
  }
  if (!appToken || !tableId || !userOpenId) return null;
  return { appToken, tableId, userOpenId };
}

function fmtDate(d: Date): string {
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function parseFilenameFromDisposition(disposition: string | null): string {
  if (!disposition) return "";
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      // ignore decode failure
    }
  }
  const plainMatch = disposition.match(/filename="?([^"]+)"?/i);
  return plainMatch?.[1]?.trim() ?? "";
}

export function App() {
  const [viewTab, setViewTab] = useState<ViewTab>("main");
  const [lang, setLang] = useState<Lang>("zh-CN");
  const [ctx, setCtx] = useState<PluginContext | null>(null);
  const mode = "sales_receipt" as const;
  const [businessTableId, setBusinessTableId] = useState(TEST_DEFAULTS.businessTableId);
  const [settlementTableId, setSettlementTableId] = useState(TEST_DEFAULTS.settlementTableId);
  const [tableOptions, setTableOptions] = useState<TableOption[]>([]);
  const [tableOptionsLoading, setTableOptionsLoading] = useState(false);
  const [businessFields, setBusinessFields] = useState<FieldOption[]>([]);
  const [settlementFields, setSettlementFields] = useState<FieldOption[]>([]);
  const [businessCustomerField, setBusinessCustomerField] = useState("");
  const [businessAmountField, setBusinessAmountField] = useState("");
  const [businessDateField, setBusinessDateField] = useState("");
  const [settlementCustomerField, setSettlementCustomerField] = useState("");
  const [settlementAmountField, setSettlementAmountField] = useState("");
  const [settlementDateField, setSettlementDateField] = useState("");
  // Simplify UX: always generate per-customer ledger statement.
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [ledgerExportToken, setLedgerExportToken] = useState("");
  const [ledgerHeaders, setLedgerHeaders] = useState<string[]>([]);
  const [businessDisplayFields, setBusinessDisplayFields] = useState<string[]>([]);
  const [settlementDisplayFields, setSettlementDisplayFields] = useState<string[]>([]);
  const [loadingHint, setLoadingHint] = useState("");
  const [lastIdempotencyKey, setLastIdempotencyKey] = useState("");
  const [remainingQuota, setRemainingQuota] = useState<number | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [exportToken, setExportToken] = useState("");
  const [startDate, setStartDate] = useState(fmtDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [endDate, setEndDate] = useState(fmtDate(new Date()));
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [activationCode, setActivationCode] = useState("");
  const [contextHint, setContextHint] = useState("");
  const [manualAppToken, setManualAppToken] = useState(TEST_DEFAULTS.appToken);
  const [manualUserId, setManualUserId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerOptions, setCustomerOptions] = useState<string[]>([]);
  const [loadStats, setLoadStats] = useState<LoadStats | null>(null);
  const [debugInfo, setDebugInfo] = useState("");
  const [quotaLogs, setQuotaLogs] = useState<QuotaLogItem[]>([]);

  const needActivation = remainingQuota !== null && remainingQuota <= 0;
  const isZh = lang === "zh-CN";
  const tr = (zh: string, en: string) => (isZh ? zh : en);
  const modeLabel =
    mode === "purchase_payment"
      ? [tr("采购", "Purchase"), tr("付款", "Payment"), tr("供应商", "Vendor")]
      : [tr("销售", "Sales"), tr("收款", "Receipt"), tr("客户", "Customer")];
  const t = I18N[lang];

  const effectiveCtx = useMemo(() => {
    if (ctx) return ctx;
    const appToken = manualAppToken.trim();
    if (!appToken) return null;
    return {
      appToken,
      tableId: businessTableId.trim() || settlementTableId.trim(),
      userOpenId: manualUserId.trim() || "record-view-debug-user",
    };
  }, [ctx, manualAppToken, manualUserId, businessTableId, settlementTableId]);

  const headers = useMemo(
    () =>
      effectiveCtx
        ? {
            "x-lark-app-token": effectiveCtx.appToken,
            "x-lark-table-id": effectiveCtx.tableId,
            "x-lark-user-id": effectiveCtx.userOpenId,
          }
        : {},
    [effectiveCtx]
  );

  useEffect(() => {
    const cachedUserId =
      typeof window !== "undefined" ? window.localStorage.getItem("dwdz.manualUserId") ?? "" : "";
    readContext().then((c) => {
      if (c) {
        setCtx(c);
        setBusinessTableId((prev) => prev || c.tableId);
        setSettlementTableId((prev) => prev || c.tableId);
        setContextHint(t.envReady);
        setManualAppToken(c.appToken);
        setManualUserId(c.userOpenId);
      } else {
        setMessage(t.envNotReady);
        const urlCtx = fromUrl();
        setManualAppToken(urlCtx.appToken ?? TEST_DEFAULTS.appToken);
        setManualUserId(cachedUserId || `debug-${Date.now().toString(36)}`);
      }
    });
  }, [t.envNotReady, t.envReady]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!manualUserId.trim()) return;
    window.localStorage.setItem("dwdz.manualUserId", manualUserId.trim());
  }, [manualUserId]);

  useEffect(() => {
    async function loadTables() {
      if (!effectiveCtx?.appToken || !effectiveCtx?.userOpenId) return;
      setTableOptionsLoading(true);
      try {
        const resp = await fetch(api("/api/get-app-tables"), { headers });
        const json = await resp.json();
        if (!resp.ok || !json.success) throw new Error(json.message || tr("读取数据表失败", "Failed to load tables"));
        const options = Array.isArray(json.tables) ? (json.tables as TableOption[]) : [];
        setTableOptions(options);
        if (options.length > 0) {
          setBusinessTableId((prev) => prev || options[0].id);
          setSettlementTableId((prev) => prev || options[Math.min(1, options.length - 1)].id);
        }
      } catch (e) {
        setTableOptions([]);
        setMessage(e instanceof Error ? e.message : tr("读取数据表失败", "Failed to load tables"));
      } finally {
        setTableOptionsLoading(false);
      }
    }
    loadTables();
  }, [effectiveCtx?.appToken, effectiveCtx?.userOpenId, headers]);

  useEffect(() => {
    async function loadQuotaLogs() {
      if (viewTab !== "settings" || !effectiveCtx) return;
      try {
        const resp = await fetch(api("/api/quota-logs?limit=20"), { headers });
        const json = await resp.json();
        if (!resp.ok || !json.success) return;
        setQuotaLogs(Array.isArray(json.list) ? (json.list as QuotaLogItem[]) : []);
      } catch {
        // ignore user log read failures to avoid impacting main flows
      }
    }
    loadQuotaLogs();
  }, [viewTab, effectiveCtx, headers, remainingQuota]);

  function actionLabel(action: string): string {
    if (action === "ACTIVATE") return tr("激活", "Activate");
    if (action === "GENERATE_LEDGER") return tr("生成明细", "Generate Ledger");
    if (action === "GENERATE_SUMMARY") return tr("生成汇总", "Generate Summary");
    return action;
  }

  async function loadFields() {
    if (!effectiveCtx) return;
    setLoading(true);
    setMessage("");
    setDebugInfo("");
    setLoadingHint(tr("读取中…", "Loading fields..."));
    try {
      const b = await fetch(api(`/api/get-table-fields?tableId=${encodeURIComponent(businessTableId)}`), { headers });
      const bj = await b.json();
      if (!b.ok || !bj.success) throw new Error(bj.message || tr("读取业务表字段失败", "Failed to load business fields"));
      const s = await fetch(api(`/api/get-table-fields?tableId=${encodeURIComponent(settlementTableId)}`), { headers });
      const sj = await s.json();
      if (!s.ok || !sj.success) throw new Error(sj.message || tr("读取结算表字段失败", "Failed to load settlement fields"));
      setBusinessFields(bj.fields ?? []);
      setSettlementFields(sj.fields ?? []);
      setCustomerOptions([]);
      setCustomerName("");
      setBusinessCustomerField("");
      setBusinessAmountField("");
      setBusinessDateField("");
      setSettlementCustomerField("");
      setSettlementAmountField("");
      setSettlementDateField("");
      setBusinessDisplayFields([]);
      setSettlementDisplayFields([]);
      setLedgerHeaders([]);
      setRemainingQuota(bj.quota?.remainingQuota ?? sj.quota?.remainingQuota ?? null);
      const optionsResp = await fetch(api("/api/customer-options"), {
        method: "POST",
        headers: { "content-type": "application/json", ...headers },
        body: JSON.stringify({
          mode,
          businessTable: { tableId: businessTableId },
          settlementTable: { tableId: settlementTableId },
        }),
      });
      const optionsJson = await optionsResp.json();
      if (optionsResp.ok && optionsJson.success) {
        setCustomerOptions(Array.isArray(optionsJson.options) ? optionsJson.options : []);
        const debug = optionsJson.debug || {};
        const optionCount = Array.isArray(optionsJson.options) ? optionsJson.options.length : 0;
        const bs = Array.isArray(debug.businessSamples) ? debug.businessSamples.join(" | ") : "-";
        const ss = Array.isArray(debug.settlementSamples) ? debug.settlementSamples.join(" | ") : "-";
        setDebugInfo(
          tr(
            `客户选项:${optionCount}；销售客户字段:${debug.businessFieldId ?? "-"}(${debug.businessOptionsCount ?? 0})；收款客户字段:${debug.settlementFieldId ?? "-"}(${debug.settlementOptionsCount ?? 0})；销售样本:${bs}；收款样本:${ss}`,
            `Customer options:${optionCount}; Sales customer field:${debug.businessFieldId ?? "-"}(${debug.businessOptionsCount ?? 0}); Receipt customer field:${debug.settlementFieldId ?? "-"}(${debug.settlementOptionsCount ?? 0}); Sales samples:${bs}; Receipt samples:${ss}`
          )
        );
      } else {
        setDebugInfo(`${tr("客户选项接口失败", "Customer options API failed")}: ${optionsJson.message ?? "unknown"}`);
      }
      setMessage(tr("字段读取成功。", "Fields loaded successfully."));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : tr("读取失败", "Load failed"));
    } finally {
      setLoadingHint("");
      setLoading(false);
    }
  }

  async function generate() {
    if (!effectiveCtx) return;
    setLoading(true);
    setMessage("");
    setLoadingHint(tr("生成中…", "Generating..."));
    try {
      const idempotencyKey =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      setLastIdempotencyKey(idempotencyKey);
      if (!customerName)
        throw new Error(tr(`请选择${modeLabel[2]}名称后再生成对账单`, `Please select ${modeLabel[2]} before generating`));
      const resp = await fetch(api("/api/generate-ledger"), {
        method: "POST",
        headers: { "content-type": "application/json", "x-idempotency-key": idempotencyKey, ...headers },
        body: JSON.stringify({
          mode,
          businessTable: {
            tableId: businessTableId,
            customerField: businessCustomerField || undefined,
            amountField: businessAmountField || undefined,
            dateField: businessDateField || undefined,
            displayFields: businessDisplayFields,
          },
          settlementTable: {
            tableId: settlementTableId,
            customerField: settlementCustomerField || undefined,
            amountField: settlementAmountField || undefined,
            dateField: settlementDateField || undefined,
            displayFields: settlementDisplayFields,
          },
          customerName: customerName.trim(),
          dateRange: { start: startDate, end: endDate },
        }),
      });
      const j = await resp.json();
      if (!resp.ok || !j.success) {
        if (resp.status === 402) setRemainingQuota(0);
        throw new Error(j.message || tr("生成失败", "Generation failed"));
      }
      setLedger(Array.isArray(j.ledger) ? j.ledger : []);
      setLedgerHeaders(Array.isArray(j.headers) ? j.headers : []);
      setLedgerExportToken(j.exportToken ?? "");
      setRows([]);
      setRemainingQuota(j.quota?.remainingQuota ?? remainingQuota);
      setMessage(tr(`已生成 ${j.ledger?.length ?? 0} 条明细。`, `Generated ${j.ledger?.length ?? 0} ledger rows.`));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : tr("生成失败", "Generation failed"));
    } finally {
      setLoadingHint("");
      setLoading(false);
    }
  }

  async function activate() {
    if (!effectiveCtx || !activationCode.trim()) return;
    setLoading(true);
    setMessage("");
    try {
      const resp = await fetch(api("/api/validate-activation-code"), {
        method: "POST",
        headers: { "content-type": "application/json", ...headers },
        body: JSON.stringify({ code: activationCode.trim() }),
      });
      const j = await resp.json();
      if (!resp.ok || !j.success) throw new Error(j.message || tr("激活失败", "Activation failed"));
      setRemainingQuota(j.quota?.remainingQuota ?? remainingQuota);
      setActivationCode("");
      setMessage(j.message || tr("激活成功", "Activation success"));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : tr("激活失败", "Activation failed"));
    } finally {
      setLoading(false);
    }
  }

  async function downloadLedger(format: "xlsx" | "csv") {
    if (!ledgerExportToken) return;
    setLoading(true);
    setMessage("");
    setLoadingHint(tr(`导出${format.toUpperCase()}中…`, `Exporting ${format.toUpperCase()}...`));
    try {
      const resp = await fetch(
        api(`/api/export-ledger-file?token=${encodeURIComponent(ledgerExportToken)}&format=${format}`),
        { headers }
      );
      if (!resp.ok) throw new Error(tr(`导出失败（${resp.status}）`, `Export failed (${resp.status})`));
      const blob = await resp.blob();
      const disposition = resp.headers.get("content-disposition");
      const ext = format === "xlsx" ? "xlsx" : "csv";
      const fallback = isZh ? `对账单.${ext}` : `reconciliation.${ext}`;
      const filename = parseFilenameFromDisposition(disposition) || fallback;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setMessage(tr(`已开始下载 ${filename}`, `Started download: ${filename}`));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : tr("导出失败", "Export failed"));
    } finally {
      setLoadingHint("");
      setLoading(false);
    }
  }

  return (
    <main className="card">
      <h2>{`${t.title} (v${PLUGIN_BUILD_VERSION})`}</h2>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <p className="muted">{tr("欢迎使用智序对账插件", "Welcome to Zhixu reconciliation plugin")}</p>
        <select value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
          <option value="zh-CN">{tr("中文", "Chinese")}</option>
          <option value="en-US">English</option>
        </select>
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        <button onClick={() => setViewTab("main")} disabled={viewTab === "main"}>
          {tr("对账", "Reconcile")}
        </button>
        <button onClick={() => setViewTab("guide")} disabled={viewTab === "guide"}>
          {tr("使用说明", "Guide")}
        </button>
        <button onClick={() => setViewTab("settings")} disabled={viewTab === "settings"}>
          {tr("设置", "Settings")}
        </button>
      </div>
      {contextHint ? <p className="muted">{contextHint}</p> : null}
      {ctx ? <p className="muted">{tr("当前用户标识", "Current User ID")}: {ctx.userOpenId}</p> : null}

      {viewTab === "main" ? (
      <div className="grid">
        <label>{modeLabel[0]}{tr("表（自动读取）", " table (auto)")}</label>
        {tableOptions.length > 0 ? (
          <select value={businessTableId} onChange={(e) => setBusinessTableId(e.target.value)} disabled={tableOptionsLoading}>
            {tableOptions.map((t) => (
              <option key={`bt-${t.id}`} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        ) : (
          <input value={businessTableId} onChange={(e) => setBusinessTableId(e.target.value)} placeholder={tr("自动读取失败时可手填 table_id", "Manual table_id if auto-load fails")} />
        )}
        <label>{modeLabel[1]}{tr("表（自动读取）", " table (auto)")}</label>
        {tableOptions.length > 0 ? (
          <select
            value={settlementTableId}
            onChange={(e) => setSettlementTableId(e.target.value)}
            disabled={tableOptionsLoading}
          >
            {tableOptions.map((t) => (
              <option key={`st-${t.id}`} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        ) : (
          <input value={settlementTableId} onChange={(e) => setSettlementTableId(e.target.value)} placeholder={tr("自动读取失败时可手填 table_id", "Manual table_id if auto-load fails")} />
        )}
        <label>{modeLabel[2]}{tr("名称（必选）", " name (required)")}</label>
        <select value={customerName} onChange={(e) => setCustomerName(e.target.value)}>
          <option value="">{tr("请选择", "Please select ")}{modeLabel[2]}</option>
          {customerOptions.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>

        <div className="row">
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <button className="primary" onClick={loadFields} disabled={loading || !effectiveCtx}>
          {t.readFields}
        </button>
      </div>
      ) : null}

      {viewTab === "main" ? (
      <details style={{ marginTop: 10 }}>
        <summary>{tr("字段映射（建议先读取字段）", "Field mapping (load fields first)")}</summary>
        <div style={{ marginTop: 8, padding: 8, border: "1px solid #e5e7eb", borderRadius: 8 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>{modeLabel[0]}{tr("表映射", " mapping")}</div>
          <div className="grid">
            <label>{modeLabel[0]}{tr("表客户字段", " customer field")}</label>
            <select value={businessCustomerField} onChange={(e) => setBusinessCustomerField(e.target.value)}>
              <option value="">{tr("自动识别", "Auto detect")}</option>
              {businessFields.map((f) => (
                <option key={`bc-${f.id}`} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            <label>{modeLabel[0]}{tr("表金额字段", " amount field")}</label>
            <select value={businessAmountField} onChange={(e) => setBusinessAmountField(e.target.value)}>
              <option value="">{tr("自动识别", "Auto detect")}</option>
              {businessFields.map((f) => (
                <option key={`ba-${f.id}`} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            <label>{modeLabel[0]}{tr("表日期字段", " date field")}</label>
            <select value={businessDateField} onChange={(e) => setBusinessDateField(e.target.value)}>
              <option value="">{tr("自动识别", "Auto detect")}</option>
              {businessFields.map((f) => (
                <option key={`bd-${f.id}`} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            <label>{modeLabel[0]}{tr("表显示字段（可勾选）", " display fields (optional)")}</label>
            <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 8 }}>
              <div className="muted" style={{ marginBottom: 6 }}>
                {tr("已选", "Selected")}: {businessDisplayFields.length ? businessDisplayFields.map((id) => businessFields.find((f) => f.id === id)?.name ?? id).join(isZh ? "、" : ", ") : tr("无", "None")}
              </div>
              <div style={{ maxHeight: 160, overflow: "auto", display: "grid", gap: 6 }}>
                {businessFields
                  .filter((f) => ![businessCustomerField, businessAmountField, businessDateField].includes(f.id))
                  .map((f) => {
                    const checked = businessDisplayFields.includes(f.id);
                    return (
                      <label key={`bshow-${f.id}`} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? Array.from(new Set([...businessDisplayFields, f.id]))
                              : businessDisplayFields.filter((x) => x !== f.id);
                            setBusinessDisplayFields(next);
                          }}
                        />
                        <span>{f.name}</span>
                      </label>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
        <div style={{ marginTop: 8, padding: 8, border: "1px solid #e5e7eb", borderRadius: 8 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>{modeLabel[1]}{tr("表映射", " mapping")}</div>
          <div className="grid">
            <label>{modeLabel[1]}{tr("表客户字段", " customer field")}</label>
            <select value={settlementCustomerField} onChange={(e) => setSettlementCustomerField(e.target.value)}>
              <option value="">{tr("自动识别", "Auto detect")}</option>
              {settlementFields.map((f) => (
                <option key={`sc-${f.id}`} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            <label>{modeLabel[1]}{tr("表金额字段", " amount field")}</label>
            <select value={settlementAmountField} onChange={(e) => setSettlementAmountField(e.target.value)}>
              <option value="">{tr("自动识别", "Auto detect")}</option>
              {settlementFields.map((f) => (
                <option key={`sa-${f.id}`} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            <label>{modeLabel[1]}{tr("表日期字段", " date field")}</label>
            <select value={settlementDateField} onChange={(e) => setSettlementDateField(e.target.value)}>
              <option value="">{tr("自动识别", "Auto detect")}</option>
              {settlementFields.map((f) => (
                <option key={`sd-${f.id}`} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            <label>{modeLabel[1]}{tr("表显示字段（可勾选）", " display fields (optional)")}</label>
            <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 8 }}>
              <div className="muted" style={{ marginBottom: 6 }}>
                {tr("已选", "Selected")}: {settlementDisplayFields.length ? settlementDisplayFields.map((id) => settlementFields.find((f) => f.id === id)?.name ?? id).join(isZh ? "、" : ", ") : tr("无", "None")}
              </div>
              <div style={{ maxHeight: 160, overflow: "auto", display: "grid", gap: 6 }}>
                {settlementFields
                  .filter((f) => ![settlementCustomerField, settlementAmountField, settlementDateField].includes(f.id))
                  .map((f) => {
                    const checked = settlementDisplayFields.includes(f.id);
                    return (
                      <label key={`sshow-${f.id}`} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? Array.from(new Set([...settlementDisplayFields, f.id]))
                              : settlementDisplayFields.filter((x) => x !== f.id);
                            setSettlementDisplayFields(next);
                          }}
                        />
                        <span>{f.name}</span>
                      </label>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      </details>
      ) : null}

      {viewTab === "settings" ? (
        <div className="grid" style={{ marginTop: 10 }}>
          <p className="muted">{t.quota}：{remainingQuota ?? "-"}</p>
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 10 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>{tr("开发者信息", "Developer Information")}</div>
            <div className="muted">{tr("开发者：智序办公", "Developer: Zhixu Office")}</div>
          </div>
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 10 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>{tr("备用上下文设置（测试/异常排查）", "Backup context settings (testing/troubleshooting)")}</div>
            <div className="grid">
              <label>{tr("Base appToken（上下文失败时手动填写）", "Base appToken (manual fallback)")}</label>
              <input
                value={manualAppToken}
                onChange={(e) => setManualAppToken(e.target.value)}
                placeholder={tr("例如：TBU4buNX3acSVzs8M5FcN168nAc", "e.g. TBU4buNX3acSVzs8M5FcN168nAc")}
              />
              <label>{tr("用户标识（系统只读）", "User ID (read-only)")}</label>
              <input value={manualUserId} readOnly disabled placeholder={tr("将自动使用飞书用户标识", "Auto-filled from Feishu context")} />
              <label>{tr("后端地址（只读）", "API Base (read-only)")}</label>
              <input value={API_BASE} readOnly disabled />
            </div>
            <p className="muted">{tr("激活码与剩余次数将绑定到此用户标识，不支持手动修改。", "Activation and quota are bound to this user ID and cannot be edited.")}</p>
          </div>
          {needActivation ? <p className="danger">{tr("试用次数已用完，请在设置页输入激活码继续使用。", "Trial quota exhausted, please activate in settings.")}</p> : null}
          <label>{tr("激活码", "Activation code")}</label>
          <input value={activationCode} onChange={(e) => setActivationCode(e.target.value)} placeholder={t.activationPlaceholder} />
          <button onClick={activate} disabled={loading || !activationCode.trim()}>
            {t.activate}
          </button>
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 10 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>{tr("如何获得激活码", "How to get activation code")}</div>
            <div className="muted">{tr("1. 试用默认 5 次，次数用完后可购买激活码。", "1. Trial includes 5 runs by default, then activation is required.")}</div>
            <div className="muted">{tr("2. 淘宝搜索店铺【智序办公服务中心】购买激活码。", "2. Purchase activation code from your official channel.")}</div>
            <div className="muted">{tr("3. 购买后在本页输入激活码并点击“激活”。", "3. Enter the code here and click Activate.")}</div>
            <div className="muted">{tr("4. 激活码与当前用户标识绑定，仅当前飞书用户可使用该激活结果。", "4. Activation is bound to current user ID only.")}</div>
          </div>
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 10 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>{tr("我的扣次/激活记录（仅当前用户可见）", "My quota/activation logs (current user only)")}</div>
            {quotaLogs.length === 0 ? (
              <div className="muted">{tr("暂无记录", "No records yet")}</div>
            ) : (
              <div style={{ maxHeight: 220, overflow: "auto", display: "grid", gap: 6 }}>
                {quotaLogs.map((log, idx) => (
                  <div key={`${log.createdAt}-${idx}`} style={{ border: "1px solid #f0f0f0", borderRadius: 6, padding: 8 }}>
                    <div>
                      {new Date(log.createdAt).toLocaleString(isZh ? "zh-CN" : "en-US")} · {actionLabel(log.action)} · {tr("变动", "Delta")}{" "}
                      {log.deltaQuota > 0 ? `+${log.deltaQuota}` : String(log.deltaQuota)} · {tr("结余", "Balance")} {log.remainingQuota}
                    </div>
                    <div className="muted">{log.detail || "-"}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {viewTab === "guide" ? (
        <div className="grid" style={{ marginTop: 10 }}>
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 10 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>{tr("使用说明", "Usage Guide")}</div>
            <div className="muted">{tr("1. 进入“对账”页后先选择销售表和收款表，点击“读取字段”。", "1. Select business and settlement tables, then click Load Fields.")}</div>
            <div className="muted">{tr("2. 如系统自动识别字段不准确，请展开“字段映射”手动指定客户字段、金额字段、日期字段。", "2. If auto mapping is inaccurate, set customer/amount/date fields manually.")}</div>
            <div className="muted">{tr("3. 字段映射作用：告诉系统每张表里“谁是客户、谁是金额、谁是日期”，避免识别错误导致结果为空或金额异常。", "3. Field mapping tells the system which columns are customer, amount and date.")}</div>
            <div className="muted">{tr("4. 多选显示字段作用：可把业务表/收款表中的附加信息（如规格、数量、单价、收款方式）带入对账明细。", "4. Optional display fields include additional details in generated ledger.")}</div>
            <div className="muted">{tr("5. 备注字段如在两张表都勾选，会自动合并为对账单中的“备注”列。", "5. Remark fields from both tables are merged into a single Remark column.")}</div>
            <div className="muted">{tr("6. 选择客户和日期范围，再点击“生成对账”；生成完成后可导出 Excel / CSV。", "6. Select customer and date range, click Generate, then export Excel/CSV.")}</div>
            <div className="muted">{tr("7. 如提示试用次数用完，请到“设置”页查看如何获取激活码。", "7. If trial quota is exhausted, go to Settings for activation instructions.")}</div>
          </div>
        </div>
      ) : null}

      {viewTab === "main" ? (
      <>
      {!ctx ? <p className="muted">{tr("未检测到飞书上下文，可前往“设置”页填写备用 Base appToken。", "Feishu context not detected. Fill backup Base appToken in Settings.")}</p> : null}
      {loadStats ? (
        <p className="muted">
          {modeLabel[0]}{tr("表读取条数", " rows")}: {loadStats.business}；{modeLabel[1]}{tr("表读取条数", " rows")}: {loadStats.settlement}；{tr("总条数", "Total")}:
          {loadStats.total}
        </p>
      ) : null}

      <button
        className="success"
        style={{ marginTop: 8, width: "100%" }}
        onClick={generate}
        disabled={loading || !effectiveCtx || needActivation}
      >
        {t.generate}
      </button>
      {needActivation ? <p className="danger">{tr("试用次数已用完，请前往“设置”页查看如何获得激活码。", "Trial quota exhausted. Please check Settings for activation.")}</p> : null}
      <div className="row" style={{ marginTop: 8 }}>
        <button onClick={() => downloadLedger("xlsx")} disabled={!ledgerExportToken || loading}>
          {t.exportExcel}
        </button>
        <button onClick={() => downloadLedger("csv")} disabled={!ledgerExportToken || loading}>
          {t.exportCsv}
        </button>
      </div>

      {message ? <p>{message}</p> : null}
      {loadingHint ? <p style={{ fontWeight: 700, color: "#b42318" }}>{loadingHint}</p> : null}

      {rows.length > 0 ? (
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>{modeLabel[2]}</th>
                <th>{modeLabel[0]}{tr("金额", " Amount")}</th>
                <th>{modeLabel[1]}{tr("金额", " Amount")}</th>
                <th>{tr("差额", "Difference")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.customerName}>
                  <td>{r.customerName}</td>
                  <td>{r.salesAmount.toFixed(2)}</td>
                  <td>{r.paymentAmount.toFixed(2)}</td>
                  <td>{r.diffAmount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      </>
      ) : null}

      {viewTab === "main" && ledger.length > 0 ? (
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                {(ledgerHeaders.length ? ledgerHeaders : Object.keys(ledger[0] ?? {})).map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ledger.map((r, idx) => (
                <tr key={`${String(r[isZh ? "日期" : "Date"] ?? "")}-${idx}`}>
                  {(ledgerHeaders.length ? ledgerHeaders : Object.keys(r)).map((h) => (
                    <td key={h}>{String(r[h] ?? "")}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="muted" style={{ marginTop: 12 }}>
        <a href={api("/legal/privacy")} target="_blank" rel="noreferrer">
          {t.privacy}
        </a>{" "}
        /{" "}
        <a href={api("/legal/terms")} target="_blank" rel="noreferrer">
          {t.terms}
        </a>
        <span style={{ marginLeft: 8 }}>v{PLUGIN_BUILD_VERSION}</span>
      </div>

      {viewTab === "main" ? (
        <details style={{ marginTop: 10 }}>
          <summary>{t.fieldsLoaded}</summary>
          <div>{modeLabel[0]}{tr("表字段", " fields")}: {businessFields.length}，{modeLabel[1]}{tr("表字段", " fields")}: {settlementFields.length}</div>
        </details>
      ) : null}
    </main>
  );
}

