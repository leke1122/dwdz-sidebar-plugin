import { forwardRef, type CSSProperties } from "react";
import type { MonthlyStatementModel } from "./monthlyStatementModel";
import { yuanIntegerToChineseUppercase } from "./lib/chineseYuanUppercase";

const wrap: CSSProperties = {
  width: 820,
  padding: "28px 32px",
  background: "#fff",
  color: "#111827",
  fontFamily: '"PingFang SC","Microsoft YaHei",SimHei,sans-serif',
  fontSize: 13,
  boxSizing: "border-box",
};

const heroTitle: CSSProperties = {
  fontSize: 24,
  fontWeight: 700,
  margin: "0 0 6px",
  letterSpacing: 0.5,
  lineHeight: 1.35,
};

const periodLine: CSSProperties = {
  fontSize: 15,
  color: "#4b5563",
  fontWeight: 600,
  margin: "0 0 14px",
};

const dash: CSSProperties = {
  borderBottom: "1px dashed #cbd5e1",
  margin: "12px 0 16px",
};

const metaGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "6px 24px",
  marginBottom: 18,
  lineHeight: 1.6,
};

const thBg: CSSProperties = {
  background: "#f4efe6",
  fontWeight: 600,
  padding: "10px 8px",
  border: "1px solid #d4cfc4",
  textAlign: "left" as const,
};

const td: CSSProperties = {
  padding: "8px",
  border: "1px solid #e5e7eb",
  verticalAlign: "middle" as const,
};

const numCell: CSSProperties = {
  ...td,
  textAlign: "right" as const,
  fontVariantNumeric: "tabular-nums",
};

const subtotalLabel: CSSProperties = {
  ...td,
  fontWeight: 700,
  textAlign: "center" as const,
  background: "#faf8f5",
};

const footer: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
  marginTop: 16,
};

const footerBox: CSSProperties = {
  border: "1px solid #d4cfc4",
  borderRadius: 6,
  padding: "12px 14px",
  background: "#fafaf9",
};

export type StatementPictureLabels = {
  startDate: string;
  endDate: string;
  statementNo: string;
  reconcileDate: string;
  lineDate: string;
  fundType: string;
  detail: string;
  qty: string;
  doc: string;
  payable: string;
  paid: string;
  closingBalance: string;
  subtotal: string;
  closingBalanceTotal: string;
};

type Props = {
  model: MonthlyStatementModel;
  labels: StatementPictureLabels;
};

export const MonthlyStatementPicture = forwardRef<HTMLDivElement, Props>(function MonthlyStatementPicture(
  { model, labels },
  ref
) {
  const cnMoney = yuanIntegerToChineseUppercase(Math.round(model.totalDiff));

  return (
    <div ref={ref} style={wrap}>
      <h1 style={heroTitle}>{model.customerName}</h1>
      <p style={periodLine}>{model.periodSubtitle}</p>
      <div style={dash} />
      <div style={metaGrid}>
        <div>
          <strong>{labels.startDate}</strong> {model.startDateDisplay}
        </div>
        <div>
          <strong>{labels.endDate}</strong> {model.endDateDisplay}
        </div>
        <div>
          <strong>{labels.statementNo}</strong> {model.statementNo}
        </div>
        <div>
          <strong>{labels.reconcileDate}</strong> {model.reconcileDateDisplay}
        </div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: "11%" }} />
          <col style={{ width: "9%" }} />
          <col style={{ width: "22%" }} />
          <col style={{ width: "7%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "13%" }} />
          <col style={{ width: "13%" }} />
          <col style={{ width: "13%" }} />
        </colgroup>
        <thead>
          <tr>
            <th style={thBg}>{labels.lineDate}</th>
            <th style={thBg}>{labels.fundType}</th>
            <th style={thBg}>{labels.detail}</th>
            <th style={{ ...thBg, textAlign: "right" }}>{labels.qty}</th>
            <th style={{ ...thBg, textAlign: "right" }}>{labels.doc}</th>
            <th style={{ ...thBg, textAlign: "right" }}>{labels.payable}</th>
            <th style={{ ...thBg, textAlign: "right" }}>{labels.paid}</th>
            <th style={{ ...thBg, textAlign: "right" }}>{labels.closingBalance}</th>
          </tr>
        </thead>
        <tbody>
          {model.lines.map((line, idx) => (
            <tr key={idx}>
              <td style={td}>{line.lineDate}</td>
              <td style={td}>{line.fundType}</td>
              <td style={{ ...td, wordBreak: "break-word" }}>{line.detail}</td>
              <td style={numCell}>{line.qty}</td>
              <td style={numCell}>{line.doc}</td>
              <td style={numCell}>{line.payable.toFixed(2)}</td>
              <td style={numCell}>{line.paid.toFixed(2)}</td>
              <td style={numCell}>{line.runningBalance.toFixed(2)}</td>
            </tr>
          ))}
          <tr>
            <td colSpan={3} style={subtotalLabel}>
              {labels.subtotal}
            </td>
            <td style={{ ...numCell, background: "#faf8f5", fontWeight: 600 }}>{model.subtotalQty}</td>
            <td style={{ ...numCell, background: "#faf8f5" }}>—</td>
            <td style={{ ...numCell, background: "#faf8f5", fontWeight: 600 }}>{model.subtotalPayable.toFixed(2)}</td>
            <td style={{ ...numCell, background: "#faf8f5", fontWeight: 600 }}>{model.subtotalPaid.toFixed(2)}</td>
            <td style={{ ...numCell, background: "#faf8f5", fontWeight: 600 }}>
              {model.subtotalClosingBalance.toFixed(2)}
            </td>
          </tr>
        </tbody>
      </table>

      <div style={footer}>
        <div style={{ ...footerBox, fontWeight: 700, fontSize: 15 }}>
          {labels.closingBalanceTotal} ¥{" "}
          {model.totalDiff.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div style={{ ...footerBox, fontSize: 15, letterSpacing: 1 }}>{cnMoney}</div>
      </div>
    </div>
  );
});
