// Sample (demo) records built on top of the live CKC catalogue, so every page has realistic data:
// sales history (30 days) and today's sales, customer orders, branch transfers, stock received and
// repair/return jobs. Everything here is clearly demo data stored in the browser.
import { PAYMENT_MODES, istDayKey } from "./sales.mjs";

const DAY = 86400000;
const CUSTOMERS = [
  ["Priya Menon", "98450 11223"],
  ["Rahul Shetty", "97400 88112"],
  ["Anitha Gowda", "96320 55778"],
  ["Suresh Kumar", "90080 22334"],
  ["Lakshmi Narayan", "98860 12345"],
  ["Kavitha Reddy", "99450 67890"],
  ["Deepa Iyer", "98801 45230"],
  ["Mohan Rao", "97311 20984"],
  ["Shruthi Bhat", "96111 73420"],
  ["Arvind Hegde", "99004 51276"],
  ["Meenakshi Sundaram", "94480 33519"],
  ["Nikhil Jain", "98455 60912"],
  ["Sowmya Prakash", "99860 21457"],
  ["Farah Khan", "97422 81630"],
  ["Ramesh Chetty", "98440 77125"],
  ["Divya Krishnan", "90363 48271"],
];
const SUPPLIERS = ["CKC Karigar Unit · Bengaluru", "CKC Bangle Workshop", "CKC Chain Section", "CKC Coorg Craft Unit", "CKC Design Studio"];
const PAYMENT_WEIGHTS = [
  ["UPI", 34],
  ["Card", 30],
  ["Cash", 12],
  ["Bank transfer", 14],
  ["Old gold exchange", 10],
];

// Small deterministic random generator so the sample data is stable and testable.
export function rng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pickOne = (r, list) => list[Math.floor(r() * list.length)];
const weighted = (r, list) => {
  const total = list.reduce((n, [, w]) => n + w, 0);
  let x = r() * total;
  for (const [v, w] of list) if ((x -= w) < 0) return v;
  return list[0][0];
};
const round10 = (n) => Math.round(n / 10) * 10;
// Instant for a given IST day key at hh:mm IST.
const istAt = (key, hours, minutes = 0) => new Date(`${key}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00+05:30`);
const keyDaysAgo = (now, n) => istDayKey(new Date(now.getTime() - n * DAY));

function saleRecord({ id, item, pieceId, branch, at, r, customer }) {
  const discount = r() < 0.35 ? 0.96 + r() * 0.035 : 1;
  const [name, phone] = customer || pickOne(r, CUSTOMERS);
  return {
    id,
    itemId: pieceId || item.id,
    designId: item.id,
    name: item.name,
    brand: item.brand || "CKC",
    category: item.category || "Jewellery",
    purity: item.purity,
    weight: Number(item.weight) || 0,
    image: item.image || null,
    branchId: branch.id,
    listPrice: Number(item.value) || 0,
    price: round10((Number(item.value) || 0) * discount),
    payment: weighted(r, PAYMENT_WEIGHTS),
    customer: r() < 0.15 ? "" : name,
    phone: r() < 0.15 ? "" : phone,
    holdId: null,
    soldBy: branch.manager || "Sales team",
    soldAt: at.toISOString(),
    state: "Completed",
    sample: true,
  };
}

/**
 * Builds sample records for the given workspace. Items must already be the live catalogue.
 * Returns a new workspace object; the input is not modified.
 */
export function applySampleData(data, { now = new Date(), seed = 7 } = {}) {
  const r = rng(seed);
  const branches = data.branches.length ? data.branches : [{ id: "BR-001", name: "Showroom", manager: "Sales team" }];
  const branchOf = (id) => branches.find((b) => b.id === id) || branches[0];
  // Spread the catalogue over the showrooms and start everything as Available.
  let items = data.items.map((item, i) => ({
    ...item,
    branchId: branches[i % branches.length].id,
    status: item.status === "Out of stock" ? "Out of stock" : "Available",
  }));
  const pool = items.filter((i) => i.status === "Available");
  if (pool.length < 16) return { ...data, items };
  const take = (() => {
    const order = pool.map((i) => i.id).sort(() => r() - 0.5);
    return () => {
      const id = order.shift();
      return items.find((i) => i.id === id);
    };
  })();
  const setStatus = (id, patch) => (items = items.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  // --- Sales: 29 days of history (earlier pieces of the same designs) + today's sales (real stock).
  const sales = [];
  let n = 1;
  for (let d = 29; d >= 1; d--) {
    const key = keyDaysAgo(now, d);
    const weekend = [0, 6].includes(new Date(`${key}T12:00:00+05:30`).getUTCDay());
    const count = 2 + Math.floor(r() * (weekend ? 6 : 4));
    for (let k = 0; k < count; k++) {
      const item = pickOne(r, pool);
      const branch = pickOne(r, branches);
      const at = istAt(key, 10 + Math.floor(r() * 10), Math.floor(r() * 60));
      sales.push(saleRecord({ id: `SALE-S${String(n).padStart(4, "0")}`, item, pieceId: `${item.id}-P${n}`, branch, at, r }));
      n++;
    }
  }
  const todayKey = istDayKey(now);
  const dayStart = istAt(todayKey, 0).getTime();
  for (let k = 0; k < 5; k++) {
    const item = take();
    const minsAgo = 20 + k * 47 + Math.floor(r() * 20);
    const at = new Date(Math.max(dayStart + (k + 1) * 60000, now.getTime() - minsAgo * 60000));
    sales.push(saleRecord({ id: `SALE-T${k + 1}`, item, branch: branchOf(item.branchId), at, r }));
    setStatus(item.id, { status: "Sold" });
  }
  sales.sort((a, b) => Date.parse(b.soldAt) - Date.parse(a.soldAt));

  // --- Customer orders: 2 pending, 2 with deposit, 1 cancelled (item stays available).
  const channels = ["Website", "Retail store", "Store pickup", "Assisted sales"];
  const holds = [];
  for (let k = 0; k < 5; k++) {
    const item = take();
    const [customer, phone] = CUSTOMERS[(k * 3 + 2) % CUSTOMERS.length];
    const state = k < 2 ? "Payment pending" : k < 4 ? "Deposit received" : "Cancelled";
    holds.push({
      id: `RSV-${2101 + k}`,
      itemId: item.id,
      channel: channels[k % channels.length],
      customer,
      phone,
      advance: state === "Deposit received" ? round10(item.value * 0.2) : 0,
      value: item.value,
      state,
      createdAt: new Date(now.getTime() - (k + 1) * 0.7 * DAY).toISOString(),
      sample: true,
    });
    if (state !== "Cancelled") setStatus(item.id, { status: "Reserved" });
  }

  // --- Transfers: 1 requested, 2 in transit, 2 received in the last days (current stock).
  const transfers = [];
  const plan = ["Requested", "In transit", "In transit", "Received", "Received"];
  plan.forEach((status, k) => {
    const item = take();
    const from = branchOf(item.branchId);
    const to = branches[(branches.indexOf(from) + 1 + (k % 2)) % branches.length];
    const createdAt = new Date(now.getTime() - (k + 1) * 5 * 3600000);
    const sentAt = status === "Requested" ? null : new Date(createdAt.getTime() + 3600000);
    const receivedAt = status === "Received" ? new Date(sentAt.getTime() + 3 * 3600000) : null;
    transfers.push({
      id: `TRF-${3101 + k}`,
      itemId: item.id,
      itemName: item.name,
      from: from.id,
      to: to.id,
      quantity: 1,
      value: item.value,
      sender: from.manager || "Showroom team",
      receiver: receivedAt ? to.manager || "Showroom team" : "",
      sentAt: sentAt?.toISOString() || null,
      receivedAt: receivedAt?.toISOString() || null,
      createdAt: createdAt.toISOString(),
      status,
      seal: sentAt ? `SEAL-${5200 + k}` : "",
      reason: pickOne(r, ["Customer request at destination", "Showroom replenishment", "Wedding season display", "Bridal consultation"]),
      historical: false,
      recordedBy: from.manager || "Showroom team",
      sample: true,
    });
    if (status === "In transit") setStatus(item.id, { status: "In transit" });
    if (status === "Received") setStatus(item.id, { branchId: to.id });
  });

  // --- Stock received (goods receipt notes) for recent designs.
  const receiptStatuses = ["Accepted", "Accepted", "Pending check", "Accepted", "Short received", "Pending check", "Accepted"];
  const receipts = receiptStatuses.map((status, k) => {
    const item = pool[(k * 5 + 3) % pool.length];
    const pcs = 1 + Math.floor(r() * 4);
    const net = Math.round((Number(item.weight) || 5) * pcs * 1000) / 1000;
    return {
      id: `GRN-${5101 + k}`,
      date: keyDaysAgo(now, 7 - k),
      supplier: SUPPLIERS[k % SUPPLIERS.length],
      invoice: `CKC-INW-${8810 + k}`,
      item: item.name,
      purity: "22K",
      pcs,
      gross: Math.round(net * 1.01 * 1000) / 1000,
      net,
      rate: item.weight ? round10(item.value / item.weight) : 0,
      branchId: branches[k % branches.length].id,
      status,
      sample: true,
    };
  });

  // --- Repair, resize, polish and return jobs on CKC pieces.
  const jobs = [
    ["Repair", "Broken clasp – replace lock", -5, -1, 2, 850],
    ["Resize", "Size 12 → 14", -3, 2, 1, 600],
    ["Return", "Exchange – customer wants a larger size", -2, 1, 1, 0],
    ["Polish", "Re-polish and clean before wedding", -8, 0, 3, 1200],
    ["Repair", "Re-attach two danglers", -12, -6, 4, 450],
    ["Return", "Online order returned – check hallmark", -1, 3, 0, 0],
    ["Polish", "Bimetal finish touch-up", -4, 1, 2, 900],
  ];
  const service = jobs.map(([type, issue, rec, prom, stage, charge], k) => {
    const item = pool[(k * 7 + 1) % pool.length];
    const [customer, phone] = CUSTOMERS[(k * 5 + 1) % CUSTOMERS.length];
    return {
      id: `JOB-${2201 + k}`,
      type,
      customer,
      phone,
      item: item.name,
      weight: Number(item.weight) || 0,
      issue,
      receivedAt: keyDaysAgo(now, -rec),
      promisedAt: keyDaysAgo(now, -prom),
      stage,
      charge,
      branchId: branches[k % branches.length].id,
      sample: true,
    };
  });

  return {
    ...data,
    items,
    sales,
    holds,
    transfers: [...transfers, ...data.transfers.filter((t) => t.historical)],
    receipts,
    service,
    sampleData: { generatedAt: now.toISOString(), seed, catalogCount: items.length },
  };
}

// Removes sample records and returns all stock to Available (keeps users, branches, history).
export function clearSampleData(data) {
  const keep = (list) => (list || []).filter((x) => !x.sample);
  const sales = keep(data.sales);
  const holds = keep(data.holds);
  const transfers = (data.transfers || []).filter((t) => t.historical || !t.sample);
  const busy = new Set([
    ...sales.filter((s) => s.state === "Completed").map((s) => s.itemId),
    ...holds.filter((h) => !["Cancelled", "Completed"].includes(h.state)).map((h) => h.itemId),
    ...transfers.filter((t) => t.status === "In transit").map((t) => t.itemId),
  ]);
  return {
    ...data,
    items: data.items.map((i) => (busy.has(i.id) || i.status === "Out of stock" ? i : { ...i, status: "Available" })),
    sales,
    holds,
    transfers,
    receipts: keep(data.receipts),
    service: keep(data.service),
    sampleData: { cleared: true, at: new Date().toISOString() },
  };
}

export { PAYMENT_MODES };
