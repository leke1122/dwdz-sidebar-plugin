import type { LedgerRow } from "./ledgerTypes";

export type StatementTableLine = {
  lineDate: string;
  fundType: string;
  detail: string;
  qty: string;
  doc: string;
  payable: number;
  paid: number;
  runningBalance: number;
};

export type MonthlyStatementModel = {
  /** 下载文件名等用，如 月度对账单-202605 */
  title: string;
  /** 副标题（图片中主标题下的一行） */
  periodSubtitle: string;
  customerName: string;
  startDateDisplay: string;
  endDateDisplay: string;
  statementNo: string;
  reconcileDateDisplay: string;
  lines: StatementTableLine[];
  subtotalQty: number;
  subtotalPayable: number;
  subtotalPaid: number;
  /** 小计行「结余」列：期末结余（最后一行滚动结余），非差额求和 */
  subtotalClosingBalance: number;
  totalDiff: number;
};

function num(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const s = String(v ?? "")
    .replace(/,/g, "")
    .replace(/[^\d.-]/g, "");
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function pickHeader(headers: string[], zh: string, en: string): string {
  if (headers.includes(zh)) return zh;
  if (headers.includes(en)) return en;
  return zh;
}

function toText(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return String(v);
}

function fmtSlash(d: string): string {
  const t = String(d ?? "").trim();
  return t ? t.replace(/-/g, "/") : "—";
}

/** 由明细对账 ledger 行构造「月度对账单」表格数据。 */
export function buildMonthlyStatementModel(
  ledger: LedgerRow[],
  headers: string[],
  customerName: string,
  startDate: string,
  endDate: string,
  reconcileDate: string
): MonthlyStatementModel | null {
  if (!ledger.length) return null;

  const dateCol = pickHeader(headers, "日期", "Date");
  const summaryCol = pickHeader(headers, "摘要", "Summary");
  const typeCol = pickHeader(headers, "类型", "Type");
  const remarkCol = pickHeader(headers, "备注", "Remark");
  const balanceCol = pickHeader(headers, "结余", "Balance");

  const bizAmt =
    headers.find((h) => /销售|采购/.test(h) && h.endsWith("金额")) ||
    headers.find((h) => h.endsWith("金额") && !/收款|付款/.test(h)) ||
    "";
  const stlAmt = headers.find((h) => /收款|付款/.test(h) && h.endsWith("金额")) || "";

  if (!bizAmt || !stlAmt) return null;

  const fixed = new Set([dateCol, typeCol, summaryCol, remarkCol, bizAmt, stlAmt, balanceCol].filter(Boolean));
  const qtyCol = headers.find((h) => /数量|qty/i.test(h));
  const priceCol = headers.find((h) => /单价|unit\s*price/i.test(h));
  const docCol = headers.find((h) => /单据|单号|编号|凭证|发票|voucher|document/i.test(h));

  const extraDisplay = headers.filter((h) => {
    if (!h || fixed.has(h)) return false;
    if (qtyCol && h === qtyCol) return false;
    if (priceCol && h === priceCol) return false;
    if (docCol && h === docCol) return false;
    return true;
  });

  let cumBalance = 0;
  const lines: StatementTableLine[] = ledger.map((row) => {
    const payable = num(row[bizAmt]);
    const paid = num(row[stlAmt]);
    const fundType = toText(row[typeCol]) || "—";

    const summary = toText(row[summaryCol]);
    const remark = toText(row[remarkCol]);
    const extras = extraDisplay.map((h) => toText(row[h])).filter(Boolean);
    const detailParts = [summary, remark, ...extras].filter((x) => x.length > 0);
    const detail = detailParts.length ? detailParts.join(" · ") : "—";

    const rawD = String(row[dateCol] ?? "").trim();
    const lineDate = rawD.includes("/") ? rawD : rawD.replace(/-/g, "/");

    /** 收款/付款行无「数量」概念，预览图数量列不填 1 */
    const isSettlementRow = /收款|付款/.test(fundType);

    let qty: string;
    if (isSettlementRow) {
      qty = "—";
    } else {
      const qtyRaw = qtyCol ? num(row[qtyCol]) : NaN;
      qty =
        qtyCol && Number.isFinite(qtyRaw) && Math.abs(qtyRaw) > 1e-9
          ? String(qtyRaw % 1 === 0 ? qtyRaw : Number(qtyRaw.toFixed(4)))
          : "1";
    }

    let doc = "—";
    if (docCol) {
      const d = toText(row[docCol]);
      if (d) doc = d;
    } else if (isSettlementRow) {
      const priceRaw = priceCol ? num(row[priceCol]) : NaN;
      if (priceCol && Number.isFinite(priceRaw) && Math.abs(priceRaw) > 1e-9) {
        doc = priceRaw.toFixed(2);
      } else if (paid > 0) {
        doc = paid.toFixed(2);
      } else if (payable > 0) {
        doc = payable.toFixed(2);
      }
    } else {
      const priceRaw = priceCol ? num(row[priceCol]) : NaN;
      if (priceCol && Number.isFinite(priceRaw) && Math.abs(priceRaw) > 1e-9) {
        doc = priceRaw.toFixed(2);
      } else if (qty !== "1") {
        const qn = Number(qty);
        const base = payable > 0 ? payable : paid;
        if (Number.isFinite(qn) && qn !== 0 && base > 0) doc = (base / qn).toFixed(2);
        else if (base > 0) doc = base.toFixed(2);
      } else {
        const base = payable > 0 ? payable : paid;
        if (base > 0) doc = base.toFixed(2);
      }
    }

    cumBalance = Number((cumBalance + (payable - paid)).toFixed(2));
    const runningBalance = balanceCol
      ? Number(num(row[balanceCol]).toFixed(2))
      : cumBalance;

    return { lineDate, fundType, detail, qty, doc, payable, paid, runningBalance };
  });

  const subtotalQty = lines.reduce((s, l) => {
    if (l.qty === "—") return s;
    const q = Number(l.qty);
    return s + (Number.isFinite(q) ? q : 0);
  }, 0);
  const subtotalPayable = Number(lines.reduce((s, l) => s + l.payable, 0).toFixed(2));
  const subtotalPaid = Number(lines.reduce((s, l) => s + l.paid, 0).toFixed(2));
  const subtotalClosingBalance = lines.length ? lines[lines.length - 1].runningBalance : 0;
  const totalDiff = subtotalClosingBalance;

  const ym = endDate.length >= 7 ? endDate.slice(0, 7).replace("-", "") : "";
  const title = ym ? `月度对账单-${ym}` : "月度对账单";
  const periodSubtitle = title;
  const statementNo = `DZD${ym || "000000"}${String(ledger.length).padStart(4, "0")}`;

  return {
    title,
    periodSubtitle,
    customerName: customerName.trim() || "—",
    startDateDisplay: fmtSlash(startDate),
    endDateDisplay: fmtSlash(endDate),
    statementNo,
    reconcileDateDisplay: fmtSlash(reconcileDate),
    lines,
    subtotalQty,
    subtotalPayable,
    subtotalPaid,
    subtotalClosingBalance,
    totalDiff,
  };
}
