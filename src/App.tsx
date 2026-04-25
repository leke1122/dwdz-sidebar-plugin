import { useEffect, useMemo, useState } from "react";

type ReconciliationMode = "sales_receipt" | "purchase_payment";
type FieldOption = { id: string; name: string; type: number };
type Row = { customerName: string; salesAmount: number; paymentAmount: number; diffAmount: number };

type PluginContext = { appToken: string; tableId: string; userOpenId: string };
type Lang = "zh-CN" | "en-US";
type LoadStats = { business: number; settlement: number; total: number };
type LedgerRow = Record<string, string | number>;

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "https://api.zxaigc.online").replace(/\/$/, "");
const TEST_DEFAULTS = {
  appToken: "TBU4buNX3acSVzs8M5FcN168nAc",
  businessTableId: "tblTuBqWx31grIHS",
  settlementTableId: "tblS7mZNU0Kd9h2S",
};

const I18N: Record<
  Lang,
  {
    title: string;
    mode: string;
    modeSales: string;
    modePurchase: string;
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
    apiLabel: string;
  }
> = {
  "zh-CN": {
    title: "智序对账插件（上架版）",
    mode: "对账模式",
    modeSales: "销售-收款",
    modePurchase: "采购-付款",
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
    apiLabel: "后端地址",
  },
  "en-US": {
    title: "Zhixu Reconciliation Plugin (Submission Build)",
    mode: "Reconciliation Mode",
    modeSales: "Sales-Receipt",
    modePurchase: "Purchase-Payment",
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
    apiLabel: "API Base",
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

export function App() {
  const [lang, setLang] = useState<Lang>("zh-CN");
  const [ctx, setCtx] = useState<PluginContext | null>(null);
  const [mode, setMode] = useState<ReconciliationMode>("sales_receipt");
  const [businessTableId, setBusinessTableId] = useState(TEST_DEFAULTS.businessTableId);
  const [settlementTableId, setSettlementTableId] = useState(TEST_DEFAULTS.settlementTableId);
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

  const needActivation = remainingQuota !== null && remainingQuota <= 0;
  const modeLabel = mode === "purchase_payment" ? ["采购", "付款", "供应商"] : ["销售", "收款", "客户"];
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

  async function loadFields() {
    if (!effectiveCtx) return;
    setLoading(true);
    setMessage("");
    setDebugInfo("");
    setLoadingHint("读取中…");
    try {
      const b = await fetch(api(`/api/get-table-fields?tableId=${encodeURIComponent(businessTableId)}`), { headers });
      const bj = await b.json();
      if (!b.ok || !bj.success) throw new Error(bj.message || "读取业务表字段失败");
      const s = await fetch(api(`/api/get-table-fields?tableId=${encodeURIComponent(settlementTableId)}`), { headers });
      const sj = await s.json();
      if (!s.ok || !sj.success) throw new Error(sj.message || "读取结算表字段失败");
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
          `客户选项:${optionCount}；销售客户字段:${debug.businessFieldId ?? "-"}(${debug.businessOptionsCount ?? 0})；收款客户字段:${debug.settlementFieldId ?? "-"}(${debug.settlementOptionsCount ?? 0})；销售样本:${bs}；收款样本:${ss}`
        );
      } else {
        setDebugInfo(`客户选项接口失败: ${optionsJson.message ?? "unknown"}`);
      }
      setMessage("字段读取成功。");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "读取失败");
    } finally {
      setLoadingHint("");
      setLoading(false);
    }
  }

  async function generate() {
    if (!effectiveCtx) return;
    setLoading(true);
    setMessage("");
    setLoadingHint("生成中…");
    try {
      const idempotencyKey =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      setLastIdempotencyKey(idempotencyKey);
      if (!customerName) throw new Error(`请选择${modeLabel[2]}名称后再生成对账单`);
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
        throw new Error(j.message || "生成失败");
      }
      setLedger(Array.isArray(j.ledger) ? j.ledger : []);
      setLedgerHeaders(Array.isArray(j.headers) ? j.headers : []);
      setLedgerExportToken(j.exportToken ?? "");
      setRows([]);
      setLedger([]);
      setLedgerExportToken("");
      setLedgerHeaders([]);
      setRemainingQuota(j.quota?.remainingQuota ?? remainingQuota);
      setMessage(`已生成 ${j.ledger?.length ?? 0} 条明细。`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "生成失败");
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
      if (!resp.ok || !j.success) throw new Error(j.message || "激活失败");
      setRemainingQuota(j.quota?.remainingQuota ?? remainingQuota);
      setActivationCode("");
      setMessage(j.message || "激活成功");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "激活失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="card">
      <h2>{t.title}</h2>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <p className="muted">
          {t.mode}：{mode === "purchase_payment" ? t.modePurchase : t.modeSales}；{t.apiLabel}：{API_BASE || "(same-origin)"}
        </p>
        <select value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
          <option value="zh-CN">中文</option>
          <option value="en-US">English</option>
        </select>
      </div>
      {contextHint ? <p className="muted">{contextHint}</p> : null}
      {!ctx ? (
        <div className="grid" style={{ marginTop: 8 }}>
          <label>Base appToken（上下文失败时手动填写）</label>
          <input
            value={manualAppToken}
            onChange={(e) => setManualAppToken(e.target.value)}
            placeholder="例如：TBU4buNX3acSVzs8M5FcN168nAc"
          />
          <label>用户标识（可默认）</label>
          <input
            value={manualUserId}
            onChange={(e) => setManualUserId(e.target.value)}
            placeholder="默认会自动生成一个调试用户ID"
          />
        </div>
      ) : null}

      <div className="grid">
        <label>{t.mode}</label>
        <select value={mode} onChange={(e) => setMode(e.target.value as ReconciliationMode)}>
          <option value="sales_receipt">{t.modeSales}</option>
          <option value="purchase_payment">{t.modePurchase}</option>
        </select>
        <label>{modeLabel[0]}表 table_id</label>
        <input value={businessTableId} onChange={(e) => setBusinessTableId(e.target.value)} />
        <label>{modeLabel[1]}表 table_id</label>
        <input value={settlementTableId} onChange={(e) => setSettlementTableId(e.target.value)} />
        <label>{modeLabel[2]}名称（必选）</label>
        <select value={customerName} onChange={(e) => setCustomerName(e.target.value)}>
          <option value="">请选择{modeLabel[2]}</option>
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
        <button className="success" onClick={generate} disabled={loading || !effectiveCtx || needActivation}>
          {t.generate}
        </button>
      </div>

      <details style={{ marginTop: 10 }}>
        <summary>字段映射（建议先读取字段）</summary>
        <div style={{ marginTop: 8, padding: 8, border: "1px solid #e5e7eb", borderRadius: 8 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>{modeLabel[0]}表映射</div>
          <div className="grid">
            <label>{modeLabel[0]}表客户字段</label>
            <select value={businessCustomerField} onChange={(e) => setBusinessCustomerField(e.target.value)}>
              <option value="">自动识别</option>
              {businessFields.map((f) => (
                <option key={`bc-${f.id}`} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            <label>{modeLabel[0]}表金额字段</label>
            <select value={businessAmountField} onChange={(e) => setBusinessAmountField(e.target.value)}>
              <option value="">自动识别</option>
              {businessFields.map((f) => (
                <option key={`ba-${f.id}`} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            <label>{modeLabel[0]}表日期字段</label>
            <select value={businessDateField} onChange={(e) => setBusinessDateField(e.target.value)}>
              <option value="">自动识别</option>
              {businessFields.map((f) => (
                <option key={`bd-${f.id}`} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            <label>{modeLabel[0]}表显示字段（可勾选）</label>
            <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 8 }}>
              <div className="muted" style={{ marginBottom: 6 }}>
                已选：{businessDisplayFields.length ? businessDisplayFields.map((id) => businessFields.find((f) => f.id === id)?.name ?? id).join("、") : "无"}
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
          <div style={{ fontWeight: 600, marginBottom: 6 }}>{modeLabel[1]}表映射</div>
          <div className="grid">
            <label>{modeLabel[1]}表客户字段</label>
            <select value={settlementCustomerField} onChange={(e) => setSettlementCustomerField(e.target.value)}>
              <option value="">自动识别</option>
              {settlementFields.map((f) => (
                <option key={`sc-${f.id}`} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            <label>{modeLabel[1]}表金额字段</label>
            <select value={settlementAmountField} onChange={(e) => setSettlementAmountField(e.target.value)}>
              <option value="">自动识别</option>
              {settlementFields.map((f) => (
                <option key={`sa-${f.id}`} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            <label>{modeLabel[1]}表日期字段</label>
            <select value={settlementDateField} onChange={(e) => setSettlementDateField(e.target.value)}>
              <option value="">自动识别</option>
              {settlementFields.map((f) => (
                <option key={`sd-${f.id}`} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            <label>{modeLabel[1]}表显示字段（可勾选）</label>
            <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 8 }}>
              <div className="muted" style={{ marginBottom: 6 }}>
                已选：{settlementDisplayFields.length ? settlementDisplayFields.map((id) => settlementFields.find((f) => f.id === id)?.name ?? id).join("、") : "无"}
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

      <p className="muted">{t.quota}：{remainingQuota ?? "-"}</p>
      {needActivation ? (
        <div className="grid">
          <p className="danger">{t.activationRequired}</p>
          <input value={activationCode} onChange={(e) => setActivationCode(e.target.value)} placeholder={t.activationPlaceholder} />
          <button onClick={activate} disabled={loading}>
            {t.activate}
          </button>
        </div>
      ) : null}

      {loadStats ? (
        <p className="muted">
          {modeLabel[0]}表读取条数：{loadStats.business}；{modeLabel[1]}表读取条数：{loadStats.settlement}；总条数：
          {loadStats.total}
        </p>
      ) : null}
      {debugInfo ? <p className="muted">调试：{debugInfo}</p> : null}

      <div className="row" style={{ marginTop: 8 }}>
        <a
          href={
            viewType === "ledger"
              ? ledgerExportToken
                ? api(`/api/export-ledger-file?token=${encodeURIComponent(ledgerExportToken)}&format=xlsx`)
                : "#"
              : exportToken
                ? api(`/api/export-file?token=${encodeURIComponent(exportToken)}&format=xlsx`)
                : "#"
          }
        >
          {t.exportExcel}
        </a>
        <a
          href={
            viewType === "ledger"
              ? ledgerExportToken
                ? api(`/api/export-ledger-file?token=${encodeURIComponent(ledgerExportToken)}&format=csv`)
                : "#"
              : exportToken
                ? api(`/api/export-file?token=${encodeURIComponent(exportToken)}&format=csv`)
                : "#"
          }
        >
          {t.exportCsv}
        </a>
      </div>

      {message ? <p>{message}</p> : null}
      {loadingHint ? <p style={{ fontWeight: 700, color: "#b42318" }}>{loadingHint}</p> : null}
      {lastIdempotencyKey ? <p className="muted">请求ID：{lastIdempotencyKey.slice(0, 8)}…</p> : null}

      {rows.length > 0 ? (
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>{modeLabel[2]}</th>
                <th>{modeLabel[0]}金额</th>
                <th>{modeLabel[1]}金额</th>
                <th>差额</th>
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

      {ledger.length > 0 ? (
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
                <tr key={`${String(r["日期"] ?? "")}-${idx}`}>
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
      </div>

      <details style={{ marginTop: 10 }}>
        <summary>{t.fieldsLoaded}</summary>
        <div>{modeLabel[0]}表字段：{businessFields.length}，{modeLabel[1]}表字段：{settlementFields.length}</div>
      </details>
    </main>
  );
}

