// Point-of-sale records and "today's sales" summaries. Days are calendar days in Asia/Kolkata (IST).

export const PAYMENT_MODES = ["Cash", "Card", "UPI", "Bank transfer", "Old gold exchange"];
export const brandOf = (item) => (item?.brand && String(item.brand).trim()) || "CKC";

const IST_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" });
// "2026-11-13" for the IST calendar day of the given instant.
export const istDayKey = (at = new Date()) => IST_DAY.format(new Date(at));

// Pure state transition: marks the item Sold and adds a sale record.
// Sellable items are Available, or Reserved (the open customer order is completed).
export function recordSale(data, { itemId, price, payment = "Cash", customer = "", phone = "", soldBy = "", at = new Date(), id } = {}) {
  const item = data.items.find((i) => i.id === itemId);
  if (!item) throw new Error("Item not found.");
  if (!["Available", "Reserved"].includes(item.status)) throw new Error(`This item is ${item.status.toLowerCase()} and cannot be sold.`);
  const amount = Number(price);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Enter the sale amount.");
  if (!PAYMENT_MODES.includes(payment)) throw new Error("Choose a payment mode.");
  const soldAt = new Date(at).toISOString();
  const openHold = (data.holds || []).find((h) => h.itemId === itemId && !["Cancelled", "Completed"].includes(h.state));
  const sale = {
    id: id || `SALE-${Date.parse(soldAt)}-${String(itemId).slice(-4)}`,
    itemId,
    name: item.name,
    brand: brandOf(item),
    category: item.category || "Jewellery",
    purity: item.purity,
    weight: Number(item.weight) || 0,
    image: item.image || null,
    branchId: item.branchId,
    listPrice: Number(item.value) || 0,
    price: Math.round(amount),
    payment,
    customer: String(customer).trim(),
    phone: String(phone).trim(),
    holdId: openHold?.id || null,
    soldBy,
    soldAt,
    state: "Completed",
  };
  return {
    ...data,
    items: data.items.map((i) => (i.id === itemId ? { ...i, status: "Sold" } : i)),
    holds: (data.holds || []).map((h) => (h.id === openHold?.id ? { ...h, state: "Completed" } : h)),
    sales: [sale, ...(data.sales || [])],
  };
}

// Reverses a sale entered by mistake: the item returns to stock and the record is kept as Voided.
export function voidSale(data, saleId, { at = new Date(), by = "" } = {}) {
  const sale = (data.sales || []).find((s) => s.id === saleId);
  if (!sale || sale.state !== "Completed") throw new Error("Sale not found or already voided.");
  return {
    ...data,
    items: data.items.map((i) => (i.id === sale.itemId && i.status === "Sold" ? { ...i, status: "Available" } : i)),
    sales: data.sales.map((s) => (s.id === saleId ? { ...s, state: "Voided", voidedAt: new Date(at).toISOString(), voidedBy: by } : s)),
  };
}

export function salesForDay(sales = [], dayKey = istDayKey(), branchId = "all") {
  return sales.filter((s) => s.state === "Completed" && istDayKey(s.soldAt) === dayKey && (branchId === "all" || s.branchId === branchId));
}

// Completed sales between two IST day keys (inclusive).
export function salesInRange(sales = [], startKey, endKey = startKey, branchId = "all") {
  return sales.filter((s) => {
    if (s.state !== "Completed" || (branchId !== "all" && s.branchId !== branchId)) return false;
    const key = istDayKey(s.soldAt);
    return key >= startKey && key <= endKey;
  });
}

// Shifts an IST day key ("2026-11-13") by whole days.
export const shiftDayKey = (key, days) => new Date(Date.parse(`${key}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);

// Named ranges used on the sales page. Returns { start, end } IST day keys.
export function salesPeriod(id, today = istDayKey()) {
  if (id === "yesterday") return { start: shiftDayKey(today, -1), end: shiftDayKey(today, -1) };
  if (id === "week") return { start: shiftDayKey(today, -6), end: today };
  if (id === "month") return { start: today.slice(0, 8) + "01", end: today };
  if (id === "30days") return { start: shiftDayKey(today, -29), end: today };
  return { start: today, end: today };
}

// Value and pieces per day for the last `days` days ending at `endKey`.
export function dailyTotals(sales = [], endKey = istDayKey(), days = 14, branchId = "all") {
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const key = shiftDayKey(endKey, -i);
    const list = salesForDay(sales, key, branchId);
    out.push({ key, pieces: list.length, value: list.reduce((n, s) => n + s.price, 0) });
  }
  return out;
}

function groupBy(list, keyFn) {
  const map = new Map();
  for (const s of list) {
    const key = keyFn(s);
    const g = map.get(key) || { key, pieces: 0, value: 0, weight: 0 };
    g.pieces += 1;
    g.value += s.price;
    g.weight += s.weight || 0;
    map.set(key, g);
  }
  return [...map.values()].sort((a, b) => b.value - a.value || b.pieces - a.pieces);
}

// Totals and breakdowns for a list of completed sales.
export function summarizeSales(sales = []) {
  const value = sales.reduce((n, s) => n + s.price, 0);
  const weight = sales.reduce((n, s) => n + (s.weight || 0), 0);
  const list = sales.reduce((n, s) => n + (s.listPrice || s.price), 0);
  return {
    pieces: sales.length,
    value,
    weight: Math.round(weight * 1000) / 1000,
    average: sales.length ? Math.round(value / sales.length) : 0,
    discount: Math.max(0, list - value),
    byBrand: groupBy(sales, (s) => s.brand || "CKC"),
    byCategory: groupBy(sales, (s) => s.category || "Jewellery"),
    byBranch: groupBy(sales, (s) => s.branchId),
    byPayment: groupBy(sales, (s) => s.payment),
    byStaff: groupBy(sales, (s) => s.soldBy || "—"),
    topDesigns: groupBy(sales, (s) => s.designId || s.itemId)
      .slice(0, 5)
      .map((g) => {
        const s = sales.find((x) => (x.designId || x.itemId) === g.key);
        return { ...g, name: s.name, image: s.image, category: s.category };
      }),
  };
}

// Stock still on hand for sale, per brand (Available + Reserved).
export function stockByBrand(items = [], branchId = "all") {
  const map = new Map();
  for (const i of items) {
    if (branchId !== "all" && i.branchId !== branchId) continue;
    const key = brandOf(i);
    const g = map.get(key) || { key, available: 0, reserved: 0, sold: 0, value: 0 };
    if (i.status === "Available") {
      g.available += 1;
      g.value += Number(i.value) || 0;
    } else if (i.status === "Reserved") g.reserved += 1;
    else if (i.status === "Sold") g.sold += 1;
    map.set(key, g);
  }
  return [...map.values()].sort((a, b) => b.available - a.available);
}
