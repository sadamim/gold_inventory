// Live product catalogue from the CKC Jewellers storefront (https://www.ckcjewellers.com/en_IN/gold).
// 1. Product listing:  GET {CKC_BASE}/on/demandware.store/Sites-CKC-Site/en_IN/Search-UpdateGrid?cgid=gold&start=0&sz=48
//    -> HTML product tiles (id, title, short description, price, image, size, availability)
// 2. Product details:  GET {CKC_BASE}/on/demandware.store/Sites-CKC-Site/en_IN/Product-Variation?pid=<id>
//    -> JSON with netMetalWeight, grossItemWeight, images[], availability (used to enrich each tile)

export const CKC_BASE = "https://www.ckcjewellers.com";
const STORE = `${CKC_BASE}/on/demandware.store/Sites-CKC-Site/en_IN`;

export const ckcGridUrl = ({ category = "gold", start = 0, size = 48 } = {}) =>
  `${STORE}/Search-UpdateGrid?cgid=${encodeURIComponent(category)}&start=${start}&sz=${size}`;
export const ckcDetailUrl = (pid) => `${STORE}/Product-Variation?pid=${encodeURIComponent(pid)}&quantity=1`;

// Keyword -> inventory category. Order matters: "ear chain" before "chain", "bangle" before "bracelet" etc.
const CATEGORY_RULES = [
  [/\b(mangal\s*sutra|mangalsutra|thali)\b/i, "Mangalsutra"],
  [/\b(ear\s*chains?|mattal)\b/i, "Ear chains"],
  [/\b(jhumkas?|jhumki|ear\s*studs?|studs?|earrings?|ear\s*rings?|drops?|hoops?)\b/i, "Earrings"],
  [/\b(nose\s*pins?|nosepins?|nath)\b/i, "Nose pins"],
  [/\b(bangles?|kadas?)\b/i, "Bangles"],
  [/\bbracelets?\b/i, "Bracelets"],
  [/\b(pendants?|lockets?)\b/i, "Pendants"],
  [/\b(necklaces?|chokers?|harams?|neckwear)\b/i, "Necklaces"],
  [/\b(anklets?|payal|kolusu)\b/i, "Anklets"],
  [/\b(waist\s*belts?|oddiyanam|vaddanam|hip\s*belts?)\b/i, "Waist belts"],
  [/\b(coins?|bars?|biscuits?)\b/i, "Coins"],
  [/\b(rings?|bands?)\b/i, "Rings"],
  [/\bchains?\b/i, "Chains"],
];
export function ckcCategory(...texts) {
  const text = texts.filter(Boolean).join(" ");
  for (const [pattern, name] of CATEGORY_RULES) if (pattern.test(text)) return name;
  return "Gold jewellery";
}

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", "#39": "'", "#x27": "'" };
export const decode = (text) =>
  String(text ?? "")
    .replace(/&(#?x?[0-9a-z]+);/gi, (m, e) => {
      const k = e.toLowerCase();
      if (ENTITIES[k]) return ENTITIES[k];
      if (k.startsWith("#x")) return String.fromCodePoint(parseInt(k.slice(2), 16));
      if (k.startsWith("#")) return String.fromCodePoint(parseInt(k.slice(1), 10));
      return m;
    })
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// "GOLD CHAIN WITH ..." -> "Gold chain with ..."; normal titles are left alone.
const tidyTitle = (text) => (text && text === text.toUpperCase() ? text.charAt(0) + text.slice(1).toLowerCase() : text);

const pick = (html, re) => {
  const m = html.match(re);
  return m ? decode(m[1]) : "";
};

// Parses the HTML returned by Search-UpdateGrid into plain product records.
export function parseCkcGrid(html) {
  const text = String(html ?? "");
  const chunks = text.split(/<div class="product" data-pid="/).slice(1);
  const seen = new Set();
  const products = [];
  for (const chunk of chunks) {
    const pid = chunk.slice(0, chunk.indexOf('"')).trim();
    if (!pid || seen.has(pid)) continue;
    seen.add(pid);
    const href = pick(chunk, /<a[^>]+href="([^"]+)"/);
    const image = pick(chunk, /<img[^>]+class="tile-image[^"]*"[^>]*src="([^"]+)"/) || pick(chunk, /<img[^>]+src="([^"]+)"/);
    const title = pick(chunk, /<div class="pdp-link[^"]*">\s*<p[^>]*>([\s\S]*?)<\/p>/);
    const shortName = pick(chunk, /<img[^>]+alt="([^"]*)"/);
    const description = pick(chunk, /<div class="short-description">([\s\S]*?)<\/div>/);
    const price = Number(pick(chunk, /<span class="value" content="([0-9.]+)"/)) || 0;
    const listPrice = Number(pick(chunk, /<span class="strike-through[\s\S]*?content="([0-9.]+)"/)) || 0;
    const size = pick(chunk, /<span class="attr-size-length">\s*Size\/Length:\s*([\s\S]*?)<\/span>/);
    const availability = pick(chunk, /availabilityMessage&quot;:&quot;([^&]*)&quot;/) || "Available";
    products.push({
      pid,
      name: tidyTitle(title) || shortName || pid,
      shortName,
      description,
      price,
      listPrice: listPrice > price ? listPrice : price,
      image: image || null,
      url: href ? new URL(href, CKC_BASE).href : null,
      size,
      availability,
      bestSeller: /class="best-seller/.test(chunk),
    });
  }
  return products;
}

const num = (value) => {
  const n = parseFloat(String(value ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 1000) / 1000 : null;
};
const purityOf = (...texts) => {
  for (const t of texts) {
    const s = typeof t === "string" ? t : "";
    const k = s.match(/\b(24|22|18|14)\s*(k|kt|karat|carat)\b/i);
    if (k) return `${k[1]}K`;
    const fineness = s.match(/\b(999|916|750|585)\b/);
    if (fineness) return { 999: "24K", 916: "22K", 750: "18K", 585: "14K" }[fineness[1]];
  }
  return null;
};

// Pulls the useful fields out of a Product-Variation JSON response.
export function parseCkcDetail(body) {
  const p = body?.product;
  if (!p || typeof p !== "object") return null;
  const images = (p.images?.large || [])
    .map((img) => img?.url)
    .filter((u) => typeof u === "string" && /^https?:\/\//.test(u));
  const group = (p.attributes || []).find((a) => a?.ID === "ckcGroup")?.attributes?.find((a) => /brand/i.test(a?.label || ""));
  const brand = (Array.isArray(group?.value) ? group.value[0] : group?.value) || p.brand;
  return {
    brand: typeof brand === "string" && brand.trim() ? brand.trim() : null,
    weight: num(p.netMetalWeight) ?? num(p.grossItemWeight),
    grossWeight: num(p.grossItemWeight),
    purity: purityOf(p.Purity, p.metalPurity, p.productName, p.shortDescription, p.longDescription),
    stoneWeight: num(p.stoneWeight),
    images,
    available: p.available !== false,
    availability: typeof p.availabilityMessage === "string" ? p.availabilityMessage : "",
  };
}

// Converts CKC records (+ optional details by pid) into the inventory item shape used by the app.
export function ckcToItems(products, details = {}, { branchId = "BR-001" } = {}) {
  return products.map((p) => {
    const d = details[p.pid] || {};
    const images = d.images?.length ? d.images : p.image ? [p.image] : [];
    const weight = d.weight ?? null;
    const purity = d.purity || purityOf(p.name, p.shortName, p.description);
    const available = d.available !== false && !/out of stock|not available|unavailable/i.test(d.availability || p.availability);
    const extras = [p.size ? `Size ${p.size}` : "", d.stoneWeight ? `Stone ${d.stoneWeight} g` : "", p.bestSeller ? "Best seller" : ""].filter(Boolean);
    return {
      id: p.pid,
      apiId: p.pid,
      sku: p.pid,
      name: p.name,
      description: p.description,
      brand: d.brand || "CKC",
      category: ckcCategory(p.name, p.shortName),
      purity: purity || "—",
      weight,
      variant: [purity, weight ? `${weight.toFixed(2)} g` : null, ...extras].filter(Boolean).join(" · ") || "—",
      unit: "Piece",
      qty: null,
      value: p.price,
      mrp: p.listPrice || p.price,
      image: p.image || images[0] || null,
      images,
      url: p.url,
      size: p.size || null,
      bestSeller: Boolean(p.bestSeller),
      photo: null,
      branchId,
      status: available ? "Available" : "Out of stock",
      owner: "Company",
      age: 0,
      source: "api",
    };
  });
}

const HEADERS = {
  "user-agent": "Mozilla/5.0 (compatible; CKC-Inventory/1.0)",
  accept: "text/html,application/json;q=0.9,*/*;q=0.8",
  "accept-language": "en-IN,en;q=0.9",
};

async function mapLimit(list, limit, fn) {
  const out = new Array(list.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, list.length) }, async () => {
    while (next < list.length) {
      const i = next++;
      out[i] = await fn(list[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}

// Fetches the live CKC catalogue. Details (weight, gallery) are best-effort; a failed detail
// call keeps the tile data instead of failing the whole catalogue.
export async function fetchCkcCatalog({ category = "gold", limit = 48, pageSize = 48, details = true, fetchImpl = fetch } = {}) {
  const products = [];
  for (let start = 0; products.length < limit; start += pageSize) {
    const res = await fetchImpl(ckcGridUrl({ category, start, size: Math.min(pageSize, limit - products.length) }), {
      cache: "no-store",
      headers: HEADERS,
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`CKC product grid responded ${res.status}`);
    const page = parseCkcGrid(await res.text());
    const fresh = page.filter((p) => !products.some((x) => x.pid === p.pid));
    products.push(...fresh);
    if (!fresh.length || page.length < Math.min(pageSize, limit)) break;
  }
  if (!products.length) throw new Error("CKC product grid returned no products");
  const found = {};
  if (details) {
    await mapLimit(products.slice(0, limit), 8, async (p) => {
      try {
        const res = await fetchImpl(ckcDetailUrl(p.pid), { cache: "no-store", headers: { ...HEADERS, accept: "application/json" }, signal: AbortSignal.timeout(8000) });
        if (res.ok) found[p.pid] = parseCkcDetail(await res.json());
      } catch {
        /* keep tile data */
      }
    });
  }
  return ckcToItems(products.slice(0, limit), found);
}
