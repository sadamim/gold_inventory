"use client";
import { useState } from "react";
import { Download, Gem, IndianRupee, Plus, ReceiptIndianRupee, Scale, ShoppingBag, Undo2 } from "lucide-react";
import { Badge, Empty, Metric, Panel, Photo, csvDownload } from "./ui";
import { money } from "../lib/reporting.mjs";
import { dailyTotals, istDayKey, salesInRange, salesPeriod, stockByBrand, summarizeSales } from "../lib/sales.mjs";

const PERIODS = [
  ["today", "Today"],
  ["yesterday", "Yesterday"],
  ["week", "Last 7 days"],
  ["month", "This month"],
  ["30days", "Last 30 days"],
  ["day", "Pick a day"],
];

const timeIST = (iso) => new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(new Date(iso));
const dayLabel = (key) =>
  new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${key}T00:00:00Z`));
const grams = (g) => `${(Number(g) || 0).toFixed(2)} g`;

function Breakdown({ title, sub, rows, label = (k) => k, total }) {
  return (
    <Panel title={title} sub={sub} compact>
      {rows.length ? (
        <div className="sales-breakdown">
          {rows.map((r) => (
            <div key={r.key} className="sales-breakdown-row">
              <div>
                <b>{label(r.key)}</b>
                <small>
                  {r.pieces} {r.pieces === 1 ? "piece" : "pieces"} · {grams(r.weight)}
                </small>
              </div>
              <span className="bar">
                <i style={{ width: `${total ? Math.max(4, (r.value / total) * 100) : 0}%` }} />
              </span>
              <strong>{money(r.value)}</strong>
            </div>
          ))}
        </div>
      ) : (
        <Empty>No sales yet.</Empty>
      )}
    </Panel>
  );
}

export default function SalesPage({ data, heading, branchName, setDialog, showItem, onVoid }) {
  const today = istDayKey();
  const [period, setPeriod] = useState("today");
  const [day, setDay] = useState(today);
  const [branch, setBranch] = useState("all");
  const [payment, setPayment] = useState("all");
  const [query, setQuery] = useState("");
  const range = period === "day" ? { start: day, end: day } : salesPeriod(period, today);
  const inRange = salesInRange(data.sales || [], range.start, range.end, branch);
  const summary = summarizeSales(inRange);
  const sales = inRange.filter(
    (s) => (payment === "all" || s.payment === payment) && `${s.name} ${s.itemId} ${s.customer} ${s.soldBy}`.toLowerCase().includes(query.toLowerCase()),
  );
  const stock = stockByBrand(data.items, branch);
  const isToday = range.start === today && range.end === today;
  const single = range.start === range.end;
  const trend = dailyTotals(data.sales || [], range.end, 14, branch);
  const trendMax = Math.max(...trend.map((t) => t.value), 1);
  const voided = (data.sales || []).filter((s) => {
    const k = istDayKey(s.soldAt);
    return s.state === "Voided" && k >= range.start && k <= range.end && (branch === "all" || s.branchId === branch);
  });
  const rangeLabel = single ? dayLabel(range.start) : `${dayLabel(range.start)} – ${dayLabel(range.end)}`;
  const periodName = PERIODS.find((p) => p[0] === period)?.[1];

  function exportCsv() {
    csvDownload(`sales-${range.start}${single ? "" : "-to-" + range.end}.csv`, [
      ["Sale ID", "Date", "Time IST", "Item", "Product", "Brand", "Category", "Weight g", "Branch", "Payment", "Customer", "List price INR", "Sale price INR", "Sold by"],
      ...sales.map((s) => [s.id, istDayKey(s.soldAt), timeIST(s.soldAt), s.itemId, s.name, s.brand, s.category, s.weight, branchName(s.branchId), s.payment, s.customer, s.listPrice, s.price, s.soldBy]),
    ]);
  }

  return (
    <>
      {heading(
        isToday ? "Today's Sales" : `Sales · ${period === "day" ? "Selected day" : periodName}`,
        `${rangeLabel} · IST. Every piece sold, by brand, category and showroom.`,
        <>
          <button onClick={exportCsv} disabled={!sales.length}>
            <Download size={16} /> Export
          </button>
          <button className="primary" onClick={() => setDialog({ type: "sell" })}>
            <Plus size={17} /> New sale
          </button>
        </>,
      )}
      <div className="segmented sales-periods" role="tablist" aria-label="Sales period">
        {PERIODS.map(([id, label]) => (
          <button key={id} className={period === id ? "active" : ""} onClick={() => setPeriod(id)} role="tab" aria-selected={period === id}>
            {label}
          </button>
        ))}
      </div>
      <div className="toolbar toolbar-flush sales-filters">
        {period === "day" && (
          <label>
            <span>Day</span>
            <input type="date" value={day} max={today} onChange={(e) => setDay(e.target.value || today)} aria-label="Sales day" />
          </label>
        )}
        <label>
          <span>Showroom</span>
          <select value={branch} onChange={(e) => setBranch(e.target.value)} aria-label="Sales showroom">
            <option value="all">All showrooms</option>
            {data.branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Payment</span>
          <select value={payment} onChange={(e) => setPayment(e.target.value)} aria-label="Payment mode">
            <option value="all">All payments</option>
            {summary.byPayment.map((p) => (
              <option key={p.key}>{p.key}</option>
            ))}
          </select>
        </label>
        <label className="sales-search">
          <span>Search</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Item, customer or staff…" aria-label="Search sales" />
        </label>
        {!isToday && (
          <button
            onClick={() => {
              setPeriod("today");
              setDay(today);
            }}
          >
            Back to today
          </button>
        )}
      </div>
      <div className="metrics">
        <Metric label="Sales value" value={money(summary.value)} sub={summary.discount ? `${money(summary.discount)} below list price` : "At list price"} icon={IndianRupee} tone="accent" />
        <Metric label="Pieces sold" value={summary.pieces} sub={`${voided.length} voided`} icon={ShoppingBag} />
        <Metric label="Gold sold" value={grams(summary.weight)} sub="Net metal weight" icon={Scale} />
        <Metric label="Average bill" value={money(summary.average)} sub="Per piece" icon={ReceiptIndianRupee} />
      </div>
      <div className="two-col">
        <Panel title="Sales trend" sub={`Daily sales value · 14 days to ${dayLabel(range.end)}`} compact>
          <div className="sales-trend" role="img" aria-label="Daily sales value for 14 days">
            {trend.map((t) => (
              <button
                key={t.key}
                className={`sales-trend-bar ${t.key >= range.start && t.key <= range.end ? "in-range" : ""}`}
                title={`${dayLabel(t.key)} · ${t.pieces} pieces · ${money(t.value)}`}
                onClick={() => {
                  setPeriod("day");
                  setDay(t.key);
                }}
              >
                <i style={{ height: `${Math.max(3, (t.value / trendMax) * 100)}%` }} />
                <small>{t.key.slice(8)}</small>
              </button>
            ))}
          </div>
          <p className="sales-trend-note">Click a day to open its sales.</p>
        </Panel>
        <Panel title="Top designs" sub="Best sellers in this period" compact>
          {summary.topDesigns.length ? (
            <div className="sales-breakdown">
              {summary.topDesigns.map((d) => (
                <div key={d.key} className="sales-breakdown-row top-design">
                  <button className="link-cell" onClick={() => showItem(d.key)}>
                    <Photo item={d} />
                    <span>
                      <b>{d.name}</b>
                      <small>
                        {d.category} · {d.pieces} sold
                      </small>
                    </span>
                  </button>
                  <strong>{money(d.value)}</strong>
                </div>
              ))}
            </div>
          ) : (
            <Empty>No sales in this period.</Empty>
          )}
        </Panel>
      </div>
      <div className="two-col">
        <Breakdown title="Sales by brand" sub="Value and weight sold per brand" rows={summary.byBrand} total={summary.value} />
        <Panel title="Stock left to sell" sub="Current stock per brand" compact>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>BRAND</th>
                  <th className="num">AVAILABLE</th>
                  <th className="num">RESERVED</th>
                  <th className="num">SOLD (ALL TIME)</th>
                  <th className="num">AVAILABLE VALUE</th>
                </tr>
              </thead>
              <tbody>
                {stock.map((g) => (
                  <tr key={g.key}>
                    <td>
                      <b>{g.key}</b>
                    </td>
                    <td className="num">{g.available}</td>
                    <td className="num">{g.reserved}</td>
                    <td className="num">{g.sold}</td>
                    <td className="num">{money(g.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
      <div className="two-col">
        <Breakdown title="By category" sub="What sold, by jewellery type" rows={summary.byCategory} total={summary.value} />
        <div className="sales-stack">
          <Breakdown title="By showroom" sub="Sales at each branch" rows={summary.byBranch} total={summary.value} label={branchName} />
          <Breakdown title="By payment" sub="How customers paid" rows={summary.byPayment} total={summary.value} />
        </div>
      </div>
      <Breakdown title="By staff" sub="Sales recorded by each team member" rows={summary.byStaff} total={summary.value} />
      <Panel
        title={isToday ? "Sold today" : single ? "Sold on this day" : "Sold in this period"}
        sub={`${sales.length} ${sales.length === 1 ? "sale" : "sales"}${sales.length !== inRange.length ? ` of ${inRange.length}` : ""} · newest first`}
      >
        {sales.length ? (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>TIME</th>
                  <th>ITEM</th>
                  <th>BRAND</th>
                  <th>SHOWROOM</th>
                  <th>CUSTOMER</th>
                  <th>PAYMENT</th>
                  <th className="num">WEIGHT</th>
                  <th className="num">SALE PRICE</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s.id}>
                    <td>
                      {single ? timeIST(s.soldAt) : `${s.soldAt && istDayKey(s.soldAt).slice(5)} · ${timeIST(s.soldAt)}`}
                      <small>{s.soldBy}</small>
                    </td>
                    <td>
                      <button className="link-cell" onClick={() => showItem(s.designId || s.itemId)}>
                        <Photo item={s} />
                        <span>
                          <b>{s.name.length > 48 ? s.name.slice(0, 47) + "…" : s.name}</b>
                          <small>
                            {s.itemId} · {s.category}
                          </small>
                        </span>
                      </button>
                    </td>
                    <td>
                      <Badge tone="gold">{s.brand}</Badge>
                    </td>
                    <td>{branchName(s.branchId)}</td>
                    <td>
                      {s.customer || "Walk-in"}
                      {s.phone && <small>{s.phone}</small>}
                    </td>
                    <td>{s.payment}</td>
                    <td className="num">{grams(s.weight)}</td>
                    <td className="num">
                      <b>{money(s.price)}</b>
                      {s.listPrice > s.price && <small>List {money(s.listPrice)}</small>}
                    </td>
                    <td>
                      <button className="text-button" onClick={() => onVoid(s)} title="Void this sale and return the item to stock">
                        <Undo2 size={14} /> Void
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>
            <Gem size={16} className="inline-icon" />
            {isToday ? "No sales recorded today. Use “New sale” or open an item and choose “Sell”." : "No sales match this period and filters."}
          </Empty>
        )}
      </Panel>
    </>
  );
}
