import test from "node:test";
import assert from "node:assert/strict";
import { mergeApiItems, normalizeProducts, parseWeight } from "../lib/products.mjs";

const body = {
  success: true,
  products: [
    {
      _id: "a1",
      name: "04 V VANKI CLOSESET",
      amount: 124760,
      offeramount: 124760,
      images: ["https://img/1"],
      color: "Rose Gold",
      weight: "10g",
      sku: "RING-234545",
      availability: "In Stock",
      qty: 301,
      isActive: true,
      category: "Rings",
      createdAt: "2026-05-25T08:39:49.837Z",
    },
    {
      _id: "a2",
      name: "Haram 22K",
      amount: 300000,
      offeramount: 280000,
      images: [],
      weight: "49.78",
      availability: "IN STOCK",
      qty: 0,
      isActive: true,
      category: "Necklace",
    },
    { _id: "a3", name: "Hidden", isActive: false },
  ],
};

test("API products map to inventory items", () => {
  const [ring, haram, ...rest] = normalizeProducts(body, { now: new Date("2026-10-01T00:00:00Z") });
  assert.equal(rest.length, 0);
  assert.equal(ring.id, "RING-234545");
  assert.equal(ring.image, "https://img/1");
  assert.equal(ring.weight, 10);
  assert.equal(ring.status, "Available");
  assert.equal(ring.category, "Rings");
  assert.equal(haram.purity, "22K");
  assert.equal(haram.value, 280000);
  assert.equal(haram.image, null);
  assert.equal(haram.status, "Out of stock");
  assert.equal(haram.category, "Necklaces");
});

test("Weights parse from strings", () => {
  assert.equal(parseWeight("12.238g"), 12.238);
  assert.equal(parseWeight(""), null);
});

test("Local workflow state survives a refresh", () => {
  const fresh = normalizeProducts(body);
  const merged = mergeApiItems([{ ...fresh[0], status: "Reserved", branchId: "BR-003" }], fresh);
  assert.equal(merged[0].status, "Reserved");
  assert.equal(merged[0].branchId, "BR-003");
  assert.equal(merged[1].status, "Out of stock");
});

test("Unexpected responses are rejected", () => {
  assert.throws(() => normalizeProducts({ success: false }));
});
