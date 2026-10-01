import { DEFAULT_PRODUCTS_API, normalizeProducts } from "../../../lib/products.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Server-side proxy for the product catalogue API. Set PRODUCTS_API_URL (and optionally
// PRODUCTS_API_TOKEN) in .env.local / Vercel to point at another environment.
const API_URL = process.env.PRODUCTS_API_URL || DEFAULT_PRODUCTS_API;
const CACHE_MS = 5 * 60 * 1000;
let cache = null;
let pending = null;

async function load() {
  const headers = { accept: "application/json" };
  if (process.env.PRODUCTS_API_TOKEN) headers.authorization = `Bearer ${process.env.PRODUCTS_API_TOKEN}`;
  const response = await fetch(API_URL, { cache: "no-store", headers, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Product API responded ${response.status}`);
  const items = normalizeProducts(await response.json());
  cache = { items, count: items.length, fetchedAt: new Date().toISOString(), source: new URL(API_URL).host };
  return cache;
}

export async function GET(request) {
  const force = new URL(request.url).searchParams.has("refresh");
  if (!force && cache && Date.now() - Date.parse(cache.fetchedAt) < CACHE_MS) return Response.json(cache);
  try {
    if (!pending) pending = load().finally(() => (pending = null));
    return Response.json(await pending);
  } catch (error) {
    if (cache) return Response.json({ ...cache, stale: true, error: "Product API unavailable. Showing the last successful catalogue." });
    return Response.json({ error: "Product API is unavailable right now.", detail: String(error?.message || error) }, { status: 502 });
  }
}
