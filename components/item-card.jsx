"use client";
import { useState } from "react";
import {
  ArrowLeftRight,
  Building2,
  Clock3,
  Copy,
  ExternalLink,
  Gem,
  Hash,
  Package,
  ReceiptIndianRupee,
  Ruler,
  Scale,
  ShieldCheck,
  Sparkles,
  Truck,
} from "lucide-react";
import { Badge } from "./ui";
import { dateTime, money } from "../lib/reporting.mjs";
import { istDayKey, shiftDayKey } from "../lib/sales.mjs";

const sizeOf = (item) => item.size || String(item.variant || "").match(/Size\s+([^·]+)/)?.[1]?.trim() || null;
const grams = (g) => (g ? `${Number(g).toFixed(2)} g` : "—");

function Gallery({ item }) {
  // Same photo can appear at several sizes (?sw=481 / ?sw=976); keep one per path, preferring the gallery copy.
  const seen = new Set();
  const images = [...(item.images || []), item.image].filter((u) => {
    const key = typeof u === "string" ? u.split("?")[0] : "";
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const [active, setActive] = useState(0);
  const [failed, setFailed] = useState({});
  const src = images[active];
  return (
    <div className="item-gallery">
      <div className="item-gallery-main">
        {src && !failed[src] ? (
          <img src={src} alt={item.name} onError={() => setFailed((f) => ({ ...f, [src]: true }))} />
        ) : (
          <div className="item-gallery-empty">
            <Package size={48} />
          </div>
        )}
        {item.bestSeller && (
          <span className="item-ribbon">
            <Sparkles size={12} /> Best seller
          </span>
        )}
      </div>
      {images.length > 1 && (
        <div className="item-thumbs" role="tablist" aria-label="Product photos">
          {images.slice(0, 6).map((u, k) => (
            <button
              key={u}
              className={k === active ? "active" : ""}
              onClick={() => setActive(k)}
              role="tab"
              aria-selected={k === active}
              aria-label={`Photo ${k + 1}`}
            >
              <img src={u} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
      {item.url && (
        <a className="item-site-link" href={item.url} target="_blank" rel="noopener noreferrer">
          View on ckcjewellers.com <ExternalLink size={14} />
        </a>
      )}
    </div>
  );
}

export default function ItemCard({ item: i, data, branchName, onReserve, onSell, onTransfer, notify }) {
  const [more, setMore] = useState(false);
  const size = sizeOf(i);
  const perGram = i.weight ? Math.round(i.value / i.weight) : null;
  const hold = data.holds.find((h) => h.itemId === i.id && !["Cancelled", "Completed"].includes(h.state));
  const sale = (data.sales || []).find((s) => s.itemId === i.id && s.state === "Completed");
  const transfer = data.transfers.find((t) => t.itemId === i.id && ["Requested", "In transit"].includes(t.status));
  const since = shiftDayKey(istDayKey(), -29);
  const designSales = (data.sales || []).filter((s) => s.state === "Completed" && (s.designId || s.itemId) === i.id && istDayKey(s.soldAt) >= since);
  const designValue = designSales.reduce((n, s) => n + s.price, 0);

  const specs = [
    [Scale, "Net weight", grams(i.weight)],
    [Gem, "Purity", i.purity && i.purity !== "—" ? i.purity : "Not published"],
    [Ruler, "Size / length", size || "—"],
    [Building2, "Showroom", branchName(i.branchId)],
    [Hash, "SKU", i.sku || i.id],
    [Clock3, "In stock for", `${i.age || 0} days`],
  ];

  const history = [
    ...data.transfers
      .filter((t) => t.itemId === i.id)
      .map((t) => ({
        at: t.receivedAt || t.sentAt || t.createdAt,
        icon: ArrowLeftRight,
        title: `${branchName(t.from)} → ${branchName(t.to)} · ${t.status}`,
        sub: t.receiver ? `Received by ${t.receiver}` : t.sentAt ? `Sent by ${t.sender}` : `Requested by ${t.recordedBy || t.sender}`,
      })),
    ...data.holds
      .filter((h) => h.itemId === i.id)
      .map((h) => ({ at: h.createdAt, icon: ShieldCheck, title: `Order ${h.id} · ${h.state}`, sub: `${h.customer} · ${h.channel}` })),
    ...(data.sales || [])
      .filter((s) => s.itemId === i.id)
      .map((s) => ({ at: s.soldAt, icon: ReceiptIndianRupee, title: `Sold for ${money(s.price)}${s.state === "Voided" ? " · voided" : ""}`, sub: `${s.payment} · ${s.soldBy}` })),
  ].sort((a, b) => Date.parse(b.at || 0) - Date.parse(a.at || 0));

  function copySku() {
    try {
      navigator.clipboard.writeText(i.sku || i.id);
      notify?.("SKU copied.");
    } catch {}
  }

  return (
    <div className="item-card">
      <Gallery item={i} key={i.id} />
      <div className="item-info">
        <div className="item-kicker">
          <span>{i.brand || "CKC"}</span>
          <i />
          <span>{i.category}</span>
        </div>
        <h2 className="item-title">{i.name}</h2>
        <div className="item-chips">
          <Badge>{i.status}</Badge>
          <span className="item-chip">
            <Building2 size={12} /> {branchName(i.branchId)}
          </span>
          <button className="item-chip item-chip-button" onClick={copySku} title="Copy SKU">
            {i.sku || i.id} <Copy size={11} />
          </button>
        </div>

        <div className="item-price">
          <div>
            <span>{i.source === "api" ? "Price" : "Sample value"}</span>
            <strong>{money(i.value)}</strong>
            {i.mrp > i.value && <s>{money(i.mrp)}</s>}
          </div>
          {perGram && (
            <div>
              <span>Per gram</span>
              <b>{money(perGram)}</b>
              <small>Price ÷ net weight</small>
            </div>
          )}
        </div>

        <div className="item-specs">
          {specs.map(([Icon, label, value]) => (
            <div key={label}>
              <Icon size={15} />
              <span>{label}</span>
              <b>{value}</b>
            </div>
          ))}
        </div>

        {hold && (
          <div className="item-callout amber">
            <ShieldCheck size={16} />
            <div>
              <b>
                Reserved for {hold.customer} · {hold.state}
              </b>
              <small>
                Order {hold.id} · {hold.channel} · Advance {money(hold.advance || 0)} · Balance {money(Math.max((hold.value ?? i.value) - (hold.advance || 0), 0))}
              </small>
            </div>
          </div>
        )}
        {sale && (
          <div className="item-callout">
            <ReceiptIndianRupee size={16} />
            <div>
              <b>
                Sold for {money(sale.price)} · {sale.payment}
              </b>
              <small>
                {dateTime(sale.soldAt)} IST · {sale.customer || "Walk-in"} · by {sale.soldBy}
              </small>
            </div>
          </div>
        )}
        {transfer && (
          <div className="item-callout amber">
            <Truck size={16} />
            <div>
              <b>
                {transfer.status === "Requested" ? "Transfer requested" : "In transit"} to {branchName(transfer.to)}
              </b>
              <small>
                {transfer.id} · {transfer.reason}
                {transfer.seal ? ` · Package ${transfer.seal}` : ""}
              </small>
            </div>
          </div>
        )}
        <div className="item-callout soft">
          <Sparkles size={16} />
          <div>
            <b>
              {designSales.length ? `This design sold ${designSales.length}× in the last 30 days` : "No sales of this design in the last 30 days"}
            </b>
            <small>{designSales.length ? `${money(designValue)} total · across all showrooms` : "Includes earlier pieces of the same design"}</small>
          </div>
        </div>

        {i.description && (
          <div className="item-section">
            <h3>About this piece</h3>
            <p className={more ? "" : "clamp"}>{i.description}</p>
            {i.description.length > 160 && (
              <button className="text-button" onClick={() => setMore(!more)}>
                {more ? "Show less" : "Read more"}
              </button>
            )}
          </div>
        )}

        <div className="item-section">
          <h3>Activity</h3>
          {history.length ? (
            <ul className="item-history">
              {history.slice(0, 6).map((h, k) => (
                <li key={k}>
                  <h.icon size={14} />
                  <div>
                    <b>{h.title}</b>
                    <small>
                      {h.sub} · {dateTime(h.at)} IST
                    </small>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted item-empty">No orders, transfers or sales for this piece yet.</p>
          )}
        </div>

        <div className="item-actions">
          {i.status === "Available" && (
            <>
              <button onClick={onTransfer}>
                <ArrowLeftRight size={16} /> Transfer
              </button>
              <button onClick={onReserve}>
                <ShieldCheck size={16} /> Reserve
              </button>
            </>
          )}
          {["Available", "Reserved"].includes(i.status) && (
            <button className="primary" onClick={onSell}>
              <ReceiptIndianRupee size={16} /> Sell this item
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
