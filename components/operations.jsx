"use client";
import { useMemo, useRef, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  Check,
  CheckCheck,
  ChevronRight,
  Clock3,
  Download,
  Globe2,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Wrench,
  X,
} from "lucide-react";
import { jewellery } from "../lib/data.mjs";
import { money } from "../lib/reporting.mjs";
import { Badge, Empty, Metric, Panel, Photo, csvDownload, grams, parseTable, shortDate } from "./ui";

const PURITIES = ["24K", "22K", "18K"];
const today = () => new Date().toISOString().slice(0, 10);
const num = (v) => {
  const n = Number(String(v ?? "").replace(/[₹,\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
};
const matches = (text, query) => text.toLowerCase().includes(query.trim().toLowerCase());

/* ------------------------------------------------------------------ */
/* Stock Received – editable, Excel-style sheet                         */
/* ------------------------------------------------------------------ */
const RECEIPT_STATUSES = ["Pending check", "Accepted", "Short received", "Rejected"];
const SHEET_COLUMNS = [
  { key: "id", label: "GRN No.", type: "text", width: 110 },
  { key: "date", label: "Date", type: "date", width: 140 },
  { key: "supplier", label: "Supplier", type: "text", width: 200 },
  { key: "invoice", label: "Invoice No.", type: "text", width: 140 },
  { key: "item", label: "Item / Design", type: "item", width: 210 },
  { key: "purity", label: "Purity", type: "purity", width: 90 },
  { key: "pcs", label: "Pcs", type: "number", width: 70, step: 1 },
  { key: "gross", label: "Gross Wt (g)", type: "number", width: 110, step: 0.001 },
  { key: "net", label: "Net Wt (g)", type: "number", width: 110, step: 0.001 },
  { key: "rate", label: "Rate ₹/g", type: "number", width: 110, step: 1 },
  { key: "amount", label: "Amount ₹", type: "computed", width: 130 },
  { key: "branchId", label: "Branch", type: "branch", width: 140 },
  { key: "status", label: "Status", type: "status", width: 150 },
];
const amountOf = (r) => Math.round(num(r.net) * num(r.rate));

export function StockReceivedSheet({ data, update, notify, heading, branchName }) {
  const saved = data.receipts || [];
  const withKeys = (list) => list.map((r) => ({ ...r, _key: r._key || crypto.randomUUID() }));
  const [rows, setRows] = useState(() => withKeys(saved));
  const [dirty, setDirty] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [paste, setPaste] = useState(null);
  const fileRef = useRef(null);
  const tableRef = useRef(null);

  const visible = rows.filter(
    (r) =>
      (status === "all" || r.status === status) && matches(`${r.id} ${r.supplier} ${r.invoice} ${r.item} ${branchName(r.branchId)}`, query),
  );
  const totals = visible.reduce(
    (t, r) => ({ pcs: t.pcs + num(r.pcs), gross: t.gross + num(r.gross), net: t.net + num(r.net), amount: t.amount + amountOf(r) }),
    { pcs: 0, gross: 0, net: 0, amount: 0 },
  );

  function edit(rowKey, key, value) {
    setRows((list) => list.map((r) => (r._key === rowKey ? { ...r, [key]: value } : r)));
    setDirty(true);
  }
  function nextId(list) {
    const max = list.reduce((m, r) => Math.max(m, Number(String(r.id).match(/(\d+)$/)?.[1] || 0)), 0);
    return "GRN-" + String(max + 1).padStart(4, "0");
  }
  function blankRow(list) {
    return {
      _key: crypto.randomUUID(),
      id: nextId(list),
      date: today(),
      supplier: "",
      invoice: "",
      item: "",
      purity: "22K",
      pcs: 1,
      gross: "",
      net: "",
      rate: "",
      branchId: data.branches[0]?.id || "",
      status: "Pending check",
    };
  }
  function addRow() {
    setRows((list) => [...list, blankRow(list)]);
    setDirty(true);
    setStatus("all");
    setQuery("");
    setTimeout(() => tableRef.current?.querySelector("tbody tr:last-child input")?.focus(), 30);
  }
  function removeRow(r) {
    setRows((list) => list.filter((x) => x !== r));
    setDirty(true);
  }
  function save() {
    const ids = rows.map((r) => String(r.id).trim());
    if (ids.some((id) => !id)) return notify("Every row needs a GRN number.");
    if (new Set(ids).size !== ids.length) return notify("GRN numbers must be unique.");
    const clean = rows.map(({ _key, ...r }) => ({
      ...r,
      id: String(r.id).trim(),
      pcs: num(r.pcs),
      gross: num(r.gross),
      net: num(r.net),
      rate: num(r.rate),
    }));
    update((d) => ({ ...d, receipts: clean }), `Saved stock received sheet (${clean.length} rows)`);
    setRows(withKeys(clean));
    setDirty(false);
    notify("Stock received sheet saved.");
  }
  function discard() {
    setRows(withKeys(saved));
    setDirty(false);
  }
  function exportSheet() {
    csvDownload("stock-received.csv", [
      SHEET_COLUMNS.map((c) => c.label),
      ...visible.map((r) =>
        SHEET_COLUMNS.map((c) => (c.key === "amount" ? amountOf(r) : c.key === "branchId" ? branchName(r.branchId) : r[c.key])),
      ),
    ]);
    notify("Exported. The file opens directly in Excel.");
  }
  function importRows(text) {
    const table = parseTable(text);
    if (!table.length) return notify("No rows found.");
    const norm = (s) => s.toLowerCase().replace(/[^a-z]/g, "");
    const headerIndex = table[0].map((h) => SHEET_COLUMNS.findIndex((c) => norm(c.label) === norm(h) || norm(c.key) === norm(h)));
    const hasHeader = headerIndex.filter((i) => i >= 0).length >= 2;
    const body = hasHeader ? table.slice(1) : table;
    const columnFor = (i) => (hasHeader ? SHEET_COLUMNS[headerIndex[i]] : SHEET_COLUMNS[i]);
    setRows((list) => {
      const next = [...list];
      for (const values of body) {
        const row = blankRow(next);
        values.forEach((value, i) => {
          const col = columnFor(i);
          if (!col || col.type === "computed" || value === "") return;
          if (col.key === "branchId")
            row.branchId = data.branches.find((b) => matches(b.name, value) || b.id === value)?.id || row.branchId;
          else if (col.key === "status") row.status = RECEIPT_STATUSES.find((s) => norm(s) === norm(value)) || row.status;
          else if (col.type === "number") row[col.key] = num(value);
          else row[col.key] = value;
        });
        if (next.some((r) => r.id === row.id)) row.id = nextId(next);
        next.push(row);
      }
      return next;
    });
    setDirty(true);
    setPaste(null);
    notify(`${body.length} row${body.length === 1 ? "" : "s"} added. Review and save the sheet.`);
  }
  function onKeyDown(e) {
    if (e.key !== "Enter" || e.target.tagName === "SELECT") return;
    e.preventDefault();
    const { row, col } = e.target.dataset;
    const target = tableRef.current?.querySelector(`[data-row="${Number(row) + (e.shiftKey ? -1 : 1)}"][data-col="${col}"]`);
    if (target) target.focus();
    else if (!e.shiftKey) addRow();
  }
  function cell(r, c, rowIndex) {
    const common = {
      "data-row": rowIndex,
      "data-col": c.key,
      "aria-label": `${c.label}, row ${rowIndex + 1}`,
      onKeyDown,
    };
    const key = r._key;
    if (c.type === "computed") return <span className="sheet-computed">{amountOf(r) ? money(amountOf(r)) : "—"}</span>;
    if (c.type === "purity" || c.type === "status" || c.type === "branch") {
      const options = c.type === "purity" ? PURITIES : c.type === "status" ? RECEIPT_STATUSES : data.branches.map((b) => [b.id, b.name]);
      return (
        <select
          {...common}
          value={r[c.key] ?? ""}
          onChange={(e) => edit(key, c.key, e.target.value)}
          className={c.type === "status" ? "status-" + String(r.status).split(" ")[0].toLowerCase() : ""}
        >
          {options.map((o) =>
            Array.isArray(o) ? (
              <option key={o[0]} value={o[0]}>
                {o[1]}
              </option>
            ) : (
              <option key={o}>{o}</option>
            ),
          )}
        </select>
      );
    }
    return (
      <input
        {...common}
        type={c.type === "item" ? "text" : c.type}
        list={c.type === "item" ? "jewellery-designs" : undefined}
        step={c.step}
        min={c.type === "number" ? 0 : undefined}
        value={r[c.key] ?? ""}
        onChange={(e) => edit(key, c.key, e.target.value)}
      />
    );
  }

  return (
    <>
      {heading(
        "Stock Received",
        "Record supplier deliveries like an Excel sheet – type directly in the cells, then save.",
        <>
          <button onClick={exportSheet}>
            <Download size={16} /> Export to Excel
          </button>
          <button className="primary" onClick={addRow}>
            <Plus size={17} /> Add row
          </button>
        </>,
      )}
      <div className="metrics">
        <Metric
          label="Deliveries"
          value={rows.length}
          sub={`${rows.filter((r) => r.status === "Pending check").length} waiting for check`}
          icon={Package}
        />
        <Metric label="Pieces received" value={rows.reduce((s, r) => s + num(r.pcs), 0)} sub="All rows in the sheet" icon={ArrowDownLeft} />
        <Metric label="Net weight" value={grams(rows.reduce((s, r) => s + num(r.net), 0))} sub="Net gold weight" icon={BarChart3} />
        <Metric
          label="Purchase value"
          value={money(rows.reduce((s, r) => s + amountOf(r), 0))}
          sub="Net weight × rate per gram"
          icon={CheckCheck}
          tone="accent"
        />
      </div>
      <Panel
        title="Stock received sheet"
        sub={dirty ? "You have unsaved changes" : `${visible.length} of ${rows.length} rows · Saved`}
        className={`sheet-panel ${dirty ? "is-dirty" : ""}`}
        action={
          dirty ? (
            <div className="sheet-save">
              <button onClick={discard}>Discard</button>
              <button className="primary" onClick={save}>
                <Check size={16} /> Save sheet
              </button>
            </div>
          ) : null
        }
      >
        <div className="toolbar">
          <label className="search-field">
            <Search size={17} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search GRN, supplier, invoice or item…"
              aria-label="Search sheet"
            />
          </label>
          <select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All statuses</option>
            {RECEIPT_STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <button onClick={() => fileRef.current?.click()}>
            <ArrowDownLeft size={15} /> Import CSV
          </button>
          <button onClick={() => setPaste(paste === null ? "" : null)}>Paste from Excel</button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.txt,text/csv"
            hidden
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) importRows(await file.text());
            }}
          />
        </div>
        {paste !== null && (
          <div className="paste-box">
            <p>
              Copy rows in Excel (with or without the header row) and paste them here. Column order:{" "}
              {SHEET_COLUMNS.filter((c) => c.type !== "computed")
                .map((c) => c.label)
                .join(", ")}
              .
            </p>
            <textarea
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              rows={5}
              placeholder="Paste Excel rows here…"
              aria-label="Paste Excel rows"
            />
            <div className="sheet-save">
              <button onClick={() => setPaste(null)}>Cancel</button>
              <button className="primary" disabled={!paste.trim()} onClick={() => importRows(paste)}>
                Add pasted rows
              </button>
            </div>
          </div>
        )}
        <datalist id="jewellery-designs">
          {[...new Set(jewellery.map((j) => j.name))].map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
        <div className="table-scroll sheet-scroll">
          <table className="sheet" ref={tableRef}>
            <thead>
              <tr>
                <th className="sheet-index">#</th>
                {SHEET_COLUMNS.map((c) => (
                  <th key={c.key} style={{ minWidth: c.width }} className={c.type === "number" || c.type === "computed" ? "num" : ""}>
                    {c.label}
                  </th>
                ))}
                <th aria-label="Row actions" />
              </tr>
            </thead>
            <tbody>
              {visible.map((r, index) => (
                <tr key={r._key}>
                  <td className="sheet-index">{index + 1}</td>
                  {SHEET_COLUMNS.map((c) => (
                    <td key={c.key} className={c.type === "number" || c.type === "computed" ? "num" : ""}>
                      {cell(r, c, index)}
                    </td>
                  ))}
                  <td>
                    <button className="icon-button" onClick={() => removeRow(r)} aria-label={`Delete row ${r.id}`}>
                      <X size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            {visible.length > 0 && (
              <tfoot>
                <tr>
                  <td className="sheet-index" />
                  <td colSpan={6}>Total ({visible.length} rows)</td>
                  <td className="num">{totals.pcs}</td>
                  <td className="num">{totals.gross.toFixed(3)}</td>
                  <td className="num">{totals.net.toFixed(3)}</td>
                  <td />
                  <td className="num">{money(totals.amount)}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            )}
          </table>
          {!visible.length && <Empty>No rows. Use “Add row” or paste rows from Excel.</Empty>}
        </div>
        <button className="sheet-add" onClick={addRow}>
          <Plus size={15} /> Add row
        </button>
        <div className="panel-footer">
          Tip: press Enter to move down a column. Amount is calculated as Net Wt × Rate. Changes are kept in this browser after you save.
        </div>
      </Panel>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Customer orders – table                                              */
/* ------------------------------------------------------------------ */
export function CustomerOrders({ data, heading, setDialog, showItem }) {
  const [query, setQuery] = useState("");
  const [state, setState] = useState("all");
  const [channel, setChannel] = useState("all");
  const orders = data.holds.map((h) => {
    const item = data.items.find((i) => i.id === h.itemId) || { id: h.itemId, name: h.itemId, value: 0 };
    const value = h.value ?? item.value ?? 0;
    const advance = h.state === "Cancelled" ? 0 : Number(h.advance || 0);
    return { ...h, item, value, advance, balance: h.state === "Cancelled" ? 0 : Math.max(value - advance, 0) };
  });
  const open = orders.filter((o) => o.state !== "Cancelled");
  const rows = orders.filter(
    (o) =>
      (state === "all" || o.state === state) &&
      (channel === "all" || o.channel === channel) &&
      matches(`${o.id} ${o.customer} ${o.phone || ""} ${o.item.name} ${o.item.id}`, query),
  );
  const channels = [...new Set(orders.map((o) => o.channel))];
  return (
    <>
      {heading(
        "Customer Orders",
        "All customer reservations and orders with payment details in one table.",
        <>
          <button
            onClick={() =>
              csvDownload("customer-orders.csv", [
                [
                  "Order",
                  "Date",
                  "Customer",
                  "Phone",
                  "Item ID",
                  "Item",
                  "Purity",
                  "Weight g",
                  "Channel",
                  "Order value",
                  "Advance",
                  "Balance",
                  "Status",
                ],
                ...rows.map((o) => [
                  o.id,
                  shortDate(o.createdAt),
                  o.customer,
                  o.phone,
                  o.item.id,
                  o.item.name,
                  o.item.purity,
                  o.item.weight,
                  o.channel,
                  o.value,
                  o.advance,
                  o.balance,
                  o.state,
                ]),
              ])
            }
          >
            <Download size={16} /> Export
          </button>
          <button className="primary" onClick={() => setDialog({ type: "reserve" })}>
            <Plus size={17} /> New order
          </button>
        </>,
      )}
      <div className="metrics">
        <Metric label="Open orders" value={open.length} sub={`${orders.length - open.length} cancelled`} icon={ShoppingBag} />
        <Metric
          label="Payment pending"
          value={open.filter((o) => o.state === "Payment pending").length}
          sub="No advance received yet"
          icon={Clock3}
        />
        <Metric
          label="Advance collected"
          value={money(open.reduce((s, o) => s + o.advance, 0))}
          sub="Across open orders"
          icon={CheckCheck}
        />
        <Metric
          label="Balance due"
          value={money(open.reduce((s, o) => s + o.balance, 0))}
          sub="To collect at delivery"
          icon={BarChart3}
          tone="accent"
        />
      </div>
      <Panel title="Orders" sub={`${rows.length} of ${orders.length} orders`}>
        <div className="toolbar">
          <label className="search-field">
            <Search size={17} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search order, customer, phone or item…"
              aria-label="Search orders"
            />
          </label>
          <select aria-label="Payment status" value={state} onChange={(e) => setState(e.target.value)}>
            <option value="all">All payment statuses</option>
            {["Payment pending", "Deposit received", "Cancelled"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select aria-label="Channel" value={channel} onChange={(e) => setChannel(e.target.value)}>
            <option value="all">All channels</option>
            {channels.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>ORDER / DATE</th>
                <th>ITEM</th>
                <th>PURITY · WEIGHT</th>
                <th>CUSTOMER</th>
                <th>CHANNEL</th>
                <th className="num">ORDER VALUE</th>
                <th className="num">ADVANCE</th>
                <th className="num">BALANCE</th>
                <th>STATUS</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id}>
                  <td>
                    <b>{o.id}</b>
                    <small>{shortDate(o.createdAt)}</small>
                  </td>
                  <td>
                    <button className="product-cell link-cell" onClick={() => showItem(o.item.id)}>
                      <Photo item={o.item} />
                      <span>
                        <b>{o.item.name}</b>
                        <small>{o.item.id}</small>
                      </span>
                    </button>
                  </td>
                  <td>
                    {o.item.purity || "—"}
                    <small>{o.item.weight ? grams(o.item.weight) : ""}</small>
                  </td>
                  <td>
                    <b>{o.customer}</b>
                    <small>{o.phone || "No phone"}</small>
                  </td>
                  <td>{o.channel}</td>
                  <td className="num">{money(o.value)}</td>
                  <td className="num">{money(o.advance)}</td>
                  <td className="num">
                    <b>{money(o.balance)}</b>
                  </td>
                  <td>
                    <Badge>{o.state}</Badge>
                  </td>
                  <td>
                    {o.state === "Payment pending" ? (
                      <button onClick={() => setDialog({ type: "cancel", id: o.id })}>Cancel</button>
                    ) : o.state === "Deposit received" ? (
                      <span className="muted">Finance review</span>
                    ) : (
                      <span className="muted">Item released</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <Empty>No orders match your filters.</Empty>}
        </div>
      </Panel>
      <Panel title="Payment exceptions" sub="Payments that need a decision by customer service or finance">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>REFERENCE</th>
                <th>ORDER</th>
                <th>WHAT HAPPENED</th>
                <th>OWNER</th>
                <th>STATUS</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <b>EXC-009</b>
                  <small>PAY-DEMO-291</small>
                </td>
                <td>WEB-3201 · Website</td>
                <td className="wrap">Payment arrived after the hold expired; the item is now reserved for another customer.</td>
                <td>Customer service + finance</td>
                <td>
                  <Badge>Review pending</Badge>
                </td>
                <td>
                  <button onClick={() => setDialog({ type: "payment" })}>
                    Review <ArrowUpRight size={14} />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Online store – table                                                 */
/* ------------------------------------------------------------------ */
export function OnlineStore({ data, update, notify, heading, setDialog, branchName, showItem }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const rows = data.items.map((i) => {
    const listed = data.online?.[i.id]?.listed ?? i.owner === "Company";
    const central = i.status === "Available" ? 1 : 0;
    const website = !listed ? null : i.id === "INV-2403" && !data.synced ? 1 : central;
    const sync = !listed ? "Hidden" : website !== central ? "Mismatch" : "In sync";
    return { ...i, listed, central, website, sync };
  });
  const visible = rows.filter(
    (r) =>
      (filter === "all" || (filter === "listed" ? r.listed : filter === "hidden" ? !r.listed : r.sync === "Mismatch")) &&
      matches(`${r.name} ${r.id} ${r.category}`, query),
  );
  function toggle(r) {
    update(
      (d) => ({ ...d, online: { ...(d.online || {}), [r.id]: { listed: !r.listed } } }),
      `${r.listed ? "Hid" : "Listed"} ${r.id} on online store`,
    );
    notify(r.listed ? `${r.name} hidden from the online store.` : `${r.name} listed on the online store.`);
  }
  return (
    <>
      {heading(
        "Online Store",
        "Compare what the website shows with the actual stock in your branches.",
        <button className="primary" onClick={() => setDialog({ type: "sync" })}>
          <RefreshCw size={16} /> Reconcile now
        </button>,
      )}
      <div className="metrics">
        <Metric label="Listed online" value={rows.filter((r) => r.listed).length} sub={`of ${rows.length} stock items`} icon={Globe2} />
        <Metric
          label="Can be bought now"
          value={rows.filter((r) => r.listed && r.central).length}
          sub="Listed and available in a branch"
          icon={CheckCheck}
        />
        <Metric label="Hidden" value={rows.filter((r) => !r.listed).length} sub="Not shown on the website" icon={ShieldCheck} />
        <Metric
          label="Mismatches"
          value={rows.filter((r) => r.sync === "Mismatch").length}
          sub="Website differs from branch stock"
          icon={RefreshCw}
          tone="accent"
        />
      </div>
      <Panel title="Website listings" sub={`${visible.length} items`}>
        <div className="toolbar">
          <label className="search-field">
            <Search size={17} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search item, category or ID…"
              aria-label="Search listings"
            />
          </label>
          <div className="segmented">
            {[
              ["all", "All"],
              ["listed", "Listed"],
              ["hidden", "Hidden"],
              ["mismatch", "Mismatch"],
            ].map(([id, label]) => (
              <button key={id} className={filter === id ? "active" : ""} aria-pressed={filter === id} onClick={() => setFilter(id)}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>ITEM</th>
                <th>CATEGORY</th>
                <th>BRANCH</th>
                <th className="num">PRICE</th>
                <th className="num">BRANCH STOCK</th>
                <th className="num">WEBSITE SHOWS</th>
                <th>SYNC</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id}>
                  <td>
                    <button className="product-cell link-cell" onClick={() => showItem(r.id)}>
                      <Photo item={r} />
                      <span>
                        <b>{r.name}</b>
                        <small>
                          {r.id} · {r.purity}
                        </small>
                      </span>
                    </button>
                  </td>
                  <td>{r.category}</td>
                  <td>
                    {branchName(r.branchId)}
                    <small>{r.status}</small>
                  </td>
                  <td className="num">{money(r.value)}</td>
                  <td className="num">{r.central}</td>
                  <td className="num">{r.website === null ? "—" : r.website}</td>
                  <td>
                    <Badge>{r.sync}</Badge>
                  </td>
                  <td>
                    {r.sync === "Mismatch" ? (
                      <button className="primary" onClick={() => setDialog({ type: "sync" })}>
                        Fix
                      </button>
                    ) : (
                      <button onClick={() => toggle(r)}>{r.listed ? "Hide" : "List online"}</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!visible.length && <Empty>No listings match your filters.</Empty>}
        </div>
        <div className="panel-footer">Demo connection: no real website is contacted. Supplier-owned items are hidden by default.</div>
      </Panel>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Repair & return jobs – stage tracker                                 */
/* ------------------------------------------------------------------ */
export const JOB_TYPES = ["Repair", "Resize", "Polish", "Return"];
const STAGES = {
  default: ["Received", "Checking", "In workshop", "Ready for pickup", "Delivered"],
  Return: ["Received", "Quality check", "Approval", "Refund / exchange ready", "Completed"],
};
const stagesFor = (type) => STAGES[type] || STAGES.default;
const daysBetween = (a, b) => Math.round((Date.parse(a) - Date.parse(b)) / 86400000);

export function ServiceJobs({ data, update, notify, heading, branchName }) {
  const jobs = data.service || [];
  const [type, setType] = useState("all");
  const [stage, setStage] = useState("open");
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const todayIso = today();
  const isDone = (j) => j.stage >= 4;
  const isLate = (j) => !isDone(j) && j.stage < 3 && j.promisedAt && j.promisedAt < todayIso;
  const counts = useMemo(
    () => [0, 1, 2, 3, 4].map((s) => jobs.filter((j) => j.stage === s && (type === "all" || j.type === type)).length),
    [jobs, type],
  );
  const rows = jobs
    .filter(
      (j) =>
        (type === "all" || j.type === type) &&
        (stage === "all" || (stage === "open" ? !isDone(j) : stage === "late" ? isLate(j) : j.stage === Number(stage))) &&
        matches(`${j.id} ${j.customer} ${j.phone} ${j.item} ${j.issue}`, query),
    )
    .sort((a, b) => isLate(b) - isLate(a) || String(a.promisedAt).localeCompare(String(b.promisedAt)));

  function advance(j) {
    const labels = stagesFor(j.type);
    if (j.stage >= 4) return;
    const next = j.stage + 1;
    update(
      (d) => ({
        ...d,
        service: d.service.map((x) => (x.id === j.id ? { ...x, stage: next, [`stage${next}At`]: new Date().toISOString() } : x)),
      }),
      `${j.id} moved to ${labels[next]}`,
    );
    notify(`${j.id} → ${labels[next]}`);
  }
  function create(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const customer = String(f.get("customer")).trim(),
      item = String(f.get("item")).trim(),
      issue = String(f.get("issue")).trim();
    if (!customer || !item || !issue) return notify("Customer, item and work needed are required.");
    const max = jobs.reduce((m, j) => Math.max(m, Number(String(j.id).match(/(\d+)$/)?.[1] || 0)), 100);
    const job = {
      id: "JOB-" + String(max + 1).padStart(4, "0"),
      type: f.get("type"),
      customer,
      phone: String(f.get("phone")).trim(),
      item,
      weight: num(f.get("weight")),
      issue,
      receivedAt: todayIso,
      promisedAt: f.get("promisedAt") || todayIso,
      stage: 0,
      charge: num(f.get("charge")),
      branchId: f.get("branch"),
    };
    update((d) => ({ ...d, service: [job, ...(d.service || [])] }), `Created ${job.type.toLowerCase()} job ${job.id}`);
    setAdding(false);
    notify(`${job.id} created. Give the customer this job number as their receipt.`);
  }

  return (
    <>
      {heading(
        "Repair & Return Jobs",
        "Every jewellery item a customer leaves with you – what needs doing, where it is now and when it is promised.",
        <button className="primary" onClick={() => setAdding(!adding)}>
          <Plus size={17} /> New job
        </button>,
      )}
      {adding && (
        <Panel
          title="New repair / return job"
          sub="Weigh the item in front of the customer and note the weight."
          action={<button onClick={() => setAdding(false)}>Cancel</button>}
        >
          <form className="panel-body job-form" onSubmit={create}>
            <div className="form-grid three">
              <label>
                Job type
                <select name="type">
                  {JOB_TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
              <label>
                Customer name
                <input name="customer" required maxLength={70} />
              </label>
              <label>
                Phone
                <input name="phone" inputMode="tel" maxLength={20} />
              </label>
              <label>
                Item
                <input name="item" required list="service-items" maxLength={80} />
              </label>
              <label>
                Weight received (g)
                <input name="weight" type="number" step="0.001" min="0" />
              </label>
              <label>
                Promised date
                <input name="promisedAt" type="date" defaultValue={todayIso} />
              </label>
              <label>
                Estimated charge ₹
                <input name="charge" type="number" min="0" step="1" defaultValue="0" />
              </label>
              <label>
                Branch
                <select name="branch">
                  {data.branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Work needed / reason
              <input name="issue" required maxLength={160} placeholder="e.g. Broken clasp, resize 12 → 14, exchange for bigger size" />
            </label>
            <datalist id="service-items">
              {[...new Set(jewellery.map((j) => j.name))].map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
            <button className="primary">Create job</button>
          </form>
        </Panel>
      )}
      <div className="stage-board" role="tablist" aria-label="Filter by stage">
        <button role="tab" aria-selected={stage === "open"} className={stage === "open" ? "active" : ""} onClick={() => setStage("open")}>
          <span>Open jobs</span>
          <b>{jobs.filter((j) => !isDone(j) && (type === "all" || j.type === type)).length}</b>
        </button>
        {STAGES.default.map((label, s) => (
          <button
            role="tab"
            key={label}
            aria-selected={stage === String(s)}
            className={stage === String(s) ? "active" : ""}
            onClick={() => setStage(String(s))}
          >
            <span>
              <i>{s + 1}</i> {s === 4 ? "Delivered / closed" : label}
            </span>
            <b>{counts[s]}</b>
          </button>
        ))}
        <button
          role="tab"
          aria-selected={stage === "late"}
          className={`late ${stage === "late" ? "active" : ""}`}
          onClick={() => setStage("late")}
        >
          <span>Past promised date</span>
          <b>{jobs.filter((j) => isLate(j) && (type === "all" || j.type === type)).length}</b>
        </button>
      </div>
      <Panel title="Jobs" sub={`${rows.length} job${rows.length === 1 ? "" : "s"} shown`}>
        <div className="toolbar">
          <label className="search-field">
            <Search size={17} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search job no., customer, phone or item…"
              aria-label="Search jobs"
            />
          </label>
          <div className="segmented">
            {["all", ...JOB_TYPES].map((t) => (
              <button key={t} className={type === t ? "active" : ""} aria-pressed={type === t} onClick={() => setType(t)}>
                {t === "all" ? "All types" : t}
              </button>
            ))}
          </div>
          <button onClick={() => setStage("all")}>Show all</button>
        </div>
        <div className="table-scroll">
          <table className="data-table jobs-table">
            <thead>
              <tr>
                <th>JOB</th>
                <th>CUSTOMER</th>
                <th>ITEM · WEIGHT IN</th>
                <th>WORK NEEDED</th>
                <th>PROMISED</th>
                <th>PROGRESS</th>
                <th className="num">CHARGE</th>
                <th>NEXT STEP</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((j) => {
                const labels = stagesFor(j.type);
                const late = isLate(j);
                const diff = daysBetween(j.promisedAt, todayIso);
                return (
                  <tr key={j.id} className={late ? "row-late" : ""}>
                    <td>
                      <b>{j.id}</b>
                      <small>
                        <span className={`job-type ${j.type.toLowerCase()}`}>{j.type}</span> · {branchName(j.branchId)}
                      </small>
                    </td>
                    <td>
                      <b>{j.customer}</b>
                      <small>{j.phone || "—"}</small>
                    </td>
                    <td>
                      {j.item}
                      <small>{j.weight ? grams(j.weight) : "Weight not noted"}</small>
                    </td>
                    <td className="wrap">{j.issue}</td>
                    <td>
                      {shortDate(j.promisedAt)}
                      <small className={late ? "late-text" : ""}>
                        {isDone(j)
                          ? "Closed"
                          : late
                            ? `Late by ${-diff} day${diff === -1 ? "" : "s"}`
                            : diff === 0
                              ? "Due today"
                              : `In ${diff} day${diff === 1 ? "" : "s"}`}
                      </small>
                    </td>
                    <td>
                      <div className="steps" aria-label={`Stage ${j.stage + 1} of 5: ${labels[j.stage]}`}>
                        {labels.map((l, s) => (
                          <i key={l} className={s < j.stage ? "done" : s === j.stage ? "now" : ""} title={l} />
                        ))}
                      </div>
                      <small>{labels[j.stage]}</small>
                    </td>
                    <td className="num">{j.charge ? money(j.charge) : j.type === "Return" ? "—" : "Free"}</td>
                    <td>
                      {isDone(j) ? (
                        <span className="muted">
                          <Check size={14} className="inline-icon" /> Done
                        </span>
                      ) : (
                        <button
                          className={`next-step ${j.stage === 3 ? "primary" : ""}`}
                          onClick={() => advance(j)}
                          title={`Move to ${labels[j.stage + 1]}`}
                        >
                          {j.stage === 3 ? (j.type === "Return" ? "Close job" : "Hand over") : labels[j.stage + 1]}{" "}
                          <ChevronRight size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!rows.length && <Empty>No jobs in this view.</Empty>}
        </div>
        <div className="panel-footer job-legend">
          <Wrench size={14} /> Repair / Resize / Polish: Received → Checking → In workshop → Ready for pickup → Delivered. &nbsp; Return:
          Received → Quality check → Approval → Refund / exchange ready → Completed.
        </div>
      </Panel>
    </>
  );
}
