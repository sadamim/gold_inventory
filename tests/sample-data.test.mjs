import test from "node:test";
import assert from "node:assert/strict";
import { applySampleData, clearSampleData } from "../lib/sample-data.mjs";
import { dailyTotals, istDayKey, salesInRange, salesPeriod, summarizeSales } from "../lib/sales.mjs";
import { initialBranches } from "../lib/data.mjs";

const now = new Date("2026-11-13T09:30:00Z"); // 15:00 IST
const catalogue = Array.from({ length: 30 }, (_, i) => ({
  id: `CKCJ_${1000 + i}`,
  name: `Design ${i}`,
  brand: "CKC",
  category: ["Rings", "Chains", "Bangles"][i % 3],
  weight: 3 + i,
  value: 30000 + i * 5000,
  branchId: "BR-001",
  status: "Available",
  source: "api",
}));
const base = { branches: initialBranches, items: catalogue, transfers: [{ id: "H1", historical: true }], holds: [], sales: [], receipts: [], service: [], events: [] };

test("Sample data fills every page from the live catalogue", () => {
  const d = applySampleData(base, { now });
  const today = istDayKey(now);
  const todaySales = d.sales.filter((s) => istDayKey(s.soldAt) === today);
  assert.equal(todaySales.length, 5);
  assert.ok(todaySales.every((s) => d.items.find((i) => i.id === s.itemId).status === "Sold"));
  assert.ok(d.sales.length > 60, "has 30 days of history");
  assert.ok(d.sales.every((s) => Date.parse(s.soldAt) <= now.getTime()));
  assert.equal(d.holds.length, 5);
  assert.equal(d.items.filter((i) => i.status === "Reserved").length, 4);
  assert.equal(d.items.filter((i) => i.status === "In transit").length, 2);
  assert.equal(d.transfers.filter((t) => t.historical).length, 1);
  assert.ok(d.receipts.length && d.service.length);
  assert.equal(new Set(d.items.map((i) => i.branchId)).size, 4, "stock spread across showrooms");
  assert.ok(d.sampleData.generatedAt);
  // Each live item is used for at most one open workflow.
  const busy = [...todaySales.map((s) => s.itemId), ...d.holds.map((h) => h.itemId), ...d.transfers.filter((t) => !t.historical).map((t) => t.itemId)];
  assert.equal(new Set(busy).size, busy.length);
});

test("Sample data is deterministic for a seed", () => {
  const a = applySampleData(base, { now, seed: 3 });
  const b = applySampleData(base, { now, seed: 3 });
  assert.deepEqual(a.sales, b.sales);
});

test("Clearing sample data keeps your own records", () => {
  const d = applySampleData(base, { now });
  const mine = { id: "SALE-MINE", itemId: "CKCJ_1029", state: "Completed", soldAt: now.toISOString(), price: 1 };
  const withMine = { ...d, sales: [mine, ...d.sales], items: d.items.map((i) => (i.id === "CKCJ_1029" ? { ...i, status: "Sold" } : i)) };
  const c = clearSampleData(withMine);
  assert.deepEqual(c.sales, [mine]);
  assert.equal(c.holds.length, 0);
  assert.equal(c.items.find((i) => i.id === "CKCJ_1029").status, "Sold");
  assert.equal(c.items.filter((i) => i.status !== "Available").length, 1);
  assert.equal(c.transfers.length, 1);
});

test("Sales periods, ranges and daily totals", () => {
  assert.deepEqual(salesPeriod("week", "2026-11-13"), { start: "2026-11-07", end: "2026-11-13" });
  assert.deepEqual(salesPeriod("month", "2026-11-13"), { start: "2026-11-01", end: "2026-11-13" });
  assert.deepEqual(salesPeriod("yesterday", "2026-03-01"), { start: "2026-02-28", end: "2026-02-28" });
  const d = applySampleData(base, { now });
  const week = salesInRange(d.sales, "2026-11-07", "2026-11-13");
  const trend = dailyTotals(d.sales, "2026-11-13", 7);
  assert.equal(trend.length, 7);
  assert.equal(trend.reduce((n, t) => n + t.pieces, 0), week.length);
  const s = summarizeSales(week);
  assert.ok(s.topDesigns.length > 0 && s.topDesigns[0].name);
  assert.ok(s.byStaff.length > 0);
});
