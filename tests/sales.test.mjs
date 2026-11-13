import test from "node:test";
import assert from "node:assert/strict";
import { istDayKey, recordSale, salesForDay, stockByBrand, summarizeSales, voidSale } from "../lib/sales.mjs";
import { mergeApiItems } from "../lib/products.mjs";

const base = () => ({
  items: [
    { id: "A", name: "Ring", brand: "CKC", category: "Rings", weight: 2.5, value: 40000, branchId: "BR-001", status: "Available", source: "api" },
    { id: "B", name: "Chain", category: "Chains", weight: 10, value: 100000, branchId: "BR-002", status: "Reserved" },
    { id: "C", name: "Bangle", brand: "CKC", category: "Bangles", weight: 8, value: 90000, branchId: "BR-001", status: "In transit" },
  ],
  holds: [{ id: "RSV-1", itemId: "B", customer: "Priya", state: "Deposit received" }],
  sales: [],
});

test("IST day boundaries", () => {
  assert.equal(istDayKey("2026-11-12T18:29:00Z"), "2026-11-12");
  assert.equal(istDayKey("2026-11-12T18:31:00Z"), "2026-11-13");
});

test("Selling marks the item Sold and records the sale", () => {
  const at = "2026-11-13T06:00:00Z";
  let d = recordSale(base(), { itemId: "A", price: 38000, payment: "UPI", soldBy: "Ananya", at });
  d = recordSale(d, { itemId: "B", price: 100000, payment: "Card", at });
  assert.equal(d.items.find((i) => i.id === "A").status, "Sold");
  assert.equal(d.holds[0].state, "Completed");
  assert.equal(d.sales[0].holdId, "RSV-1");
  assert.equal(d.sales[0].brand, "CKC");
  const today = salesForDay(d.sales, "2026-11-13");
  const s = summarizeSales(today);
  assert.equal(s.pieces, 2);
  assert.equal(s.value, 138000);
  assert.equal(s.weight, 12.5);
  assert.equal(s.discount, 2000);
  assert.deepEqual(s.byBrand.map((g) => [g.key, g.pieces]), [["CKC", 2]]);
  assert.equal(s.byCategory[0].key, "Chains");
  assert.equal(salesForDay(d.sales, "2026-11-13", "BR-001").length, 1);
  assert.equal(salesForDay(d.sales, "2026-11-12").length, 0);
});

test("Items that are not on hand cannot be sold", () => {
  assert.throws(() => recordSale(base(), { itemId: "C", price: 1 }), /in transit/);
  assert.throws(() => recordSale(base(), { itemId: "A", price: 0 }), /amount/);
  const sold = recordSale(base(), { itemId: "A", price: 1 });
  assert.throws(() => recordSale(sold, { itemId: "A", price: 1 }), /sold/);
});

test("Voiding returns the item to stock and drops it from totals", () => {
  const d = recordSale(base(), { itemId: "A", price: 40000, at: "2026-11-13T06:00:00Z", id: "S1" });
  const v = voidSale(d, "S1");
  assert.equal(v.items.find((i) => i.id === "A").status, "Available");
  assert.equal(v.sales[0].state, "Voided");
  assert.equal(salesForDay(v.sales, "2026-11-13").length, 0);
  assert.throws(() => voidSale(v, "S1"));
});

test("Stock by brand and Sold survives a catalogue refresh", () => {
  const d = recordSale(base(), { itemId: "A", price: 40000 });
  const stock = stockByBrand(d.items);
  assert.deepEqual(stock.find((g) => g.key === "CKC"), { key: "CKC", available: 0, reserved: 1, sold: 1, value: 0 });
  const merged = mergeApiItems(d.items, [{ ...base().items[0] }]);
  assert.equal(merged[0].status, "Sold");
});
