// Converts the Muliya product API response into the inventory item format used by the app.
// Source: GET https://muliya-dev-six.vercel.app/api/product/allProduct?lang=1
//   -> { success: true, products: [{ _id, name, description, amount, offeramount, images[], color, weight,
//        gold_weight, stone_weight, material, sku, availability, qty, isActive, category, createdAt, ... }] }

export const DEFAULT_PRODUCTS_API = "https://muliya-dev-six.vercel.app/api/product/allProduct?lang=1";

const CATEGORY_NAMES = {
  ring: "Rings",
  rings: "Rings",
  bracelet: "Bracelets",
  bracelets: "Bracelets",
  necklace: "Necklaces",
  necklaces: "Necklaces",
  earring: "Earrings",
  earrings: "Earrings",
  pendant: "Pendants",
  pendants: "Pendants",
  bangle: "Bangles",
  bangles: "Bangles",
  chain: "Chains",
  chains: "Chains",
  mangalsutra: "Mangalsutra",
};

export function parseWeight(value) {
  const n = parseFloat(String(value ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 1000) / 1000 : null;
}

export function parsePurity(...texts) {
  for (const text of texts) {
    const match = String(text ?? "").match(/\b(24|22|18|14)\s*(k|kt|karat|carat)\b/i);
    if (match) return `${match[1]}K`;
  }
  return null;
}

const clean = (text) =>
  String(text ?? "")
    .replace(/\s+/g, " ")
    .trim();

export function normalizeProducts(body, { now = new Date(), branchId = "BR-001" } = {}) {
  const list = Array.isArray(body) ? body : Array.isArray(body?.products) ? body.products : null;
  if (!list) throw new Error("Unexpected product API response");
  const seen = new Set();
  const items = [];
  for (const p of list) {
    if (!p || p.isActive === false || !p.name) continue;
    const id = clean(p.sku) || String(p._id);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const images = (Array.isArray(p.images) ? p.images : [p.images]).filter((u) => typeof u === "string" && /^https?:\/\//.test(u));
    const weight = parseWeight(p.gold_weight) ?? parseWeight(p.weight);
    const purity = parsePurity(p.material, p.name, p.description, p.color);
    const qty = Number.isFinite(Number(p.qty)) ? Math.max(0, Math.floor(Number(p.qty))) : null;
    const inStock = /in\s*stock/i.test(String(p.availability ?? "in stock")) && qty !== 0;
    const price = Number(p.offeramount) > 0 ? Number(p.offeramount) : Number(p.amount) || 0;
    const created = Date.parse(p.createdAt);
    const rawCategory = clean(p.category);
    const details = [clean(p.material), clean(p.color), p.stone_weight ? `Stone ${clean(p.stone_weight)}` : ""].filter(Boolean);
    items.push({
      id,
      apiId: String(p._id ?? ""),
      sku: clean(p.sku),
      name: clean(p.name),
      description: clean(p.description),
      category: CATEGORY_NAMES[rawCategory.toLowerCase()] || rawCategory || "Jewellery",
      purity: purity || "—",
      weight,
      variant: [purity, weight ? `${weight.toFixed(2)} g` : null, ...details].filter(Boolean).join(" · ") || "—",
      unit: "Piece",
      qty,
      value: price,
      mrp: Number(p.amount) || price,
      image: images[0] || null,
      images,
      photo: null,
      branchId,
      status: inStock ? "Available" : "Out of stock",
      owner: "Company",
      age: Number.isFinite(created) ? Math.max(0, Math.floor((now.getTime() - created) / 86400000)) : 0,
      source: "api",
    });
  }
  return items;
}

// Merge fresh API products into locally saved items. Local workflow state (reservations,
// transfers, branch moves, quarantine) is kept; product details come from the API.
const LOCAL_STATES = ["Reserved", "In transit", "Quarantine"];
export function mergeApiItems(localItems = [], apiItems = []) {
  const local = new Map(localItems.map((i) => [i.id, i]));
  return apiItems.map((item) => {
    const previous = local.get(item.id);
    if (!previous || previous.source !== "api") return item;
    return {
      ...item,
      branchId: previous.branchId || item.branchId,
      status: LOCAL_STATES.includes(previous.status) ? previous.status : item.status,
    };
  });
}
