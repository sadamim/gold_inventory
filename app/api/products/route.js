import { normalizeProducts } from "../../../lib/products.mjs";
import { CKC_BASE, fetchCkcCatalog } from "../../../lib/ckc.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Server-side proxy for the product catalogue.
// Default: live CKC Jewellers gold catalogue (ckcjewellers.com/en_IN/gold).
//   CKC_CATEGORY  storefront category id (default "gold")
//   CKC_LIMIT     number of products to load (default 48, max 200)
// Alternative: set PRODUCTS_API_URL (and optionally PRODUCTS_API_TOKEN) to use a JSON product API
// in the { products: [...] } format handled by lib/products.mjs.
const API_URL = process.env.PRODUCTS_API_URL || "";
const CATEGORY = process.env.CKC_CATEGORY || "gold";
const LIMIT = Math.min(200, Math.max(1, Number(process.env.CKC_LIMIT) || 48));
const CACHE_MS = 5 * 60 * 1000;
let cache = null;
let pending = null;

async function loadFromApi() {
  const headers = { accept: "application/json" };
  if (process.env.PRODUCTS_API_TOKEN) headers.authorization = `Bearer ${process.env.PRODUCTS_API_TOKEN}`;
  const response = await fetch(API_URL, { cache: "no-store", headers, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Product API responded ${response.status}`);
  return { items: normalizeProducts(await response.json()), source: new URL(API_URL).host };
}

async function load() {
  const { items, source } = API_URL
    ? await loadFromApi()
    : { items: await fetchCkcCatalog({ category: CATEGORY, limit: LIMIT }), source: new URL(CKC_BASE).host.replace(/^www\./, "") };
  if (!items.length) throw new Error("Catalogue is empty");
  cache = { items, count: items.length, fetchedAt: new Date().toISOString(), source, category: API_URL ? null : CATEGORY };
  return cache;
}

export async function GET(request) {
  const force = new URL(request.url).searchParams.has("refresh");
  if (!force && cache && Date.now() - Date.parse(cache.fetchedAt) < CACHE_MS) return Response.json(cache);
  try {
    if (!pending) pending = load().finally(() => (pending = null));
    return Response.json(await pending);
  } catch (error) {
    if (cache) return Response.json({ ...cache, stale: true, error: "Product catalogue unavailable. Showing the last successful catalogue." });
    return Response.json({ error: "Product catalogue is unavailable right now.", detail: String(error?.message || error) }, { status: 502 });
  }
}
