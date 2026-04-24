import { useEffect, useMemo, useState } from "react";

type ReconciliationMode = "sales_receipt" | "purchase_payment";
type FieldOption = { id: string; name: string; type: number };
type Row = { customerName: string; salesAmount: number; paymentAmount: number; diffAmount: number };

type PluginContext = { appToken: string; tableId: string; userOpenId: string };
type Lang = "zh-CN" | "en-US";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

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
    tt?: { getEnvInfo?: () => Promise<Record<string, unknown>> };
  };

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

  if ((!appToken || !tableId || !userOpenId) && w.tt?.getEnvInfo) {
    try {
      const env = await w.tt.getEnvInfo();
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
  const [businessTableId, setBusinessTableId] = useState("");
  const [settlementTableId, setSettlementTableId] = useState("");
  const [businessFields, setBusinessFields] = useState<FieldOption[]>([]);
  const [settlementFields, setSettlementFields] = useState<FieldOption[]>([]);
  const [remainingQuota, setRemainingQuota] = useState<number | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [exportToken, setExportToken] = useState("");
  const [startDate, setStartDate] = useState(fmtDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [endDate, setEndDate] = useState(fmtDate(new Date()));
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [activationCode, setActivationCode] = useState("");
  const [contextHint, setContextHint] = useState("");

  const needActivation = remainingQuota !== null && remainingQuota <= 0;
  const modeLabel = mode === "purchase_payment" ? ["采购", "付款", "供应商"] : ["销售", "收款", "客户"];
  const t = I18N[lang];

  const headers = useMemo(
    () =>
      ctx
        ? {
            "x-lark-app-token": ctx.appToken,
            "x-lark-table-id": ctx.tableId,
            "x-lark-user-id": ctx.userOpenId,
          }
        : {},
    [ctx]
  );

  useEffect(() => {
    readContext().then((c) => {
      if (c) {
        setCtx(c);
        setBusinessTableId(c.tableId);
        setSettlementTableId(c.tableId);
        setContextHint(t.envReady);
      } else {
        setMessage(t.envNotReady);
      }
    });
  }, [t.envNotReady, t.envReady]);

  async function loadFields() {
    if (!ctx) return;
    setLoading(true);
    setMessage("");
    try {
      const b = await fetch(api(`/api/get-table-fields?tableId=${encodeURIComponent(businessTableId)}`), { headers });
      const bj = await b.json();
      if (!b.ok || !bj.success) throw new Error(bj.message || "读取业务表字段失败");
      const s = await fetch(api(`/api/get-table-fields?tableId=${encodeURIComponent(settlementTableId)}`), { headers });
      const sj = await s.json();
      if (!s.ok || !sj.success) throw new Error(sj.message || "读取结算表字段失败");
      setBusinessFields(bj.fields ?? []);
      setSettlementFields(sj.fields ?? []);
      setRemainingQuota(bj.quota?.remainingQuota ?? sj.quota?.remainingQuota ?? null);
      setMessage("字段读取成功。");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "读取失败");
    } finally {
      setLoading(false);
    }
  }

  async function generate() {
    if (!ctx) return;
    setLoading(true);
    setMessage("");
    try {
      const resp = await fetch(api("/api/generate-reconciliation"), {
        method: "POST",
        headers: { "content-type": "application/json", ...headers },
        body: JSON.stringify({
          mode,
          businessTable: { tableId: businessTableId },
          settlementTable: { tableId: settlementTableId },
          dateRange: { start: startDate, end: endDate },
        }),
      });
      const j = await resp.json();
      if (!resp.ok || !j.success) {
        if (resp.status === 402) setRemainingQuota(0);
        throw new Error(j.message || "生成失败");
      }
      setRows(j.rows ?? []);
      setExportToken(j.exportToken ?? "");
      setRemainingQuota(j.quota?.remainingQuota ?? remainingQuota);
      setMessage(`已生成 ${j.rows?.length ?? 0} 条记录。`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "生成失败");
    } finally {
      setLoading(false);
    }
  }

  async function activate() {
    if (!ctx || !activationCode.trim()) return;
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

        <div className="row">
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <button className="primary" onClick={loadFields} disabled={loading || !ctx}>
          {t.readFields}
        </button>
        <button className="success" onClick={generate} disabled={loading || !ctx || needActivation}>
          {t.generate}
        </button>
      </div>

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

      <div className="row" style={{ marginTop: 8 }}>
        <a href={exportToken ? api(`/api/export-file?token=${encodeURIComponent(exportToken)}&format=xlsx`) : "#"}>{t.exportExcel}</a>
        <a href={exportToken ? api(`/api/export-file?token=${encodeURIComponent(exportToken)}&format=csv`) : "#"}>{t.exportCsv}</a>
      </div>

      {message ? <p>{message}</p> : null}

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

