"use client";
import { useState } from "react";
import { Box, Package } from "lucide-react";

const AMBER = /Reserved|Pending|transit|Deposit|Review|With service|Inspection|Short|Overdue|Checking|workshop|Partly|Not listed/i;
const RED = /Quarantine|Mismatch|unavailable|Rejected|Late/i;
const NEUTRAL = /Cancelled|Demo|Completed|Delivered|Hidden/i;

export function Badge({ children, tone }) {
  const text = String(children);
  const cls = tone ?? (AMBER.test(text) ? "amber" : RED.test(text) ? "red" : NEUTRAL.test(text) ? "neutral" : "");
  return <span className={`badge ${cls}`}>{children}</span>;
}

// Shows the product's own image (item.image / item.imageUrl). Falls back to an icon
// when the record has no image or the image cannot be loaded.
export function Photo({ item, large = false }) {
  const [failed, setFailed] = useState(false);
  const src = item?.image || item?.imageUrl;
  if (src && !failed)
    return (
      <div className={`product-photo jewel ${large ? "large" : ""}`}>
        <img src={src} alt={item.name} loading="lazy" onError={() => setFailed(true)} />
      </div>
    );
  return (
    <div className={`product-photo fallback ${large ? "large" : ""}`} role="img" aria-label={`${item?.name || "Item"}, no image`}>
      <Package size={large ? 52 : 20} />
    </div>
  );
}

export function Empty({ children }) {
  return (
    <div className="empty">
      <Box size={28} />
      <p>{children}</p>
    </div>
  );
}

export function Panel({ title, sub, action, children, className = "" }) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-title">
        <div>
          <h2>{title}</h2>
          {sub && <p>{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Metric({ label, value, sub, icon: Icon = Box, tone = "" }) {
  return (
    <div className={`metric ${tone}`}>
      <div className="metric-label">
        {label}
        <Icon size={17} />
      </div>
      <strong>{value}</strong>
      <p>{sub}</p>
    </div>
  );
}

// CSV with a UTF-8 BOM opens directly in Excel with ₹ and Indian names intact.
export function csvDownload(name, rows) {
  const csv = rows
    .map((row) =>
      row
        .map((v) => {
          const text = String(v ?? "");
          return '"' + (/^[=+\-@]/.test(text) ? "'" : "") + text.replaceAll('"', '""') + '"';
        })
        .join(","),
    )
    .join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Parses CSV (comma) or rows pasted from Excel (tab separated).
export function parseTable(text) {
  const delimiter = text.includes("\t") ? "\t" : ",";
  const rows = [];
  let row = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === delimiter) {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows
    .map((r) =>
      r.map((v) =>
        v
          .replace(/^\uFEFF/, "")
          .replace(/^'(?=[=+\-@])/, "")
          .trim(),
      ),
    )
    .filter((r) => r.some(Boolean));
}

export const grams = (n) => `${Number(n || 0).toFixed(2)} g`;
export const shortDate = (value) =>
  value ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value)) : "—";
