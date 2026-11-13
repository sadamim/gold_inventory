import test from "node:test";
import assert from "node:assert/strict";
import { ckcCategory, ckcToItems, fetchCkcCatalog, parseCkcDetail, parseCkcGrid } from "../lib/ckc.mjs";

const tile = (pid, title, price, extra = "") => `
<div class="product" data-pid="${pid}">
  <a rel="noopener" target="_blank" class="h-100" href="/en_IN/${pid}.html">
  <div class="product-tile">
    ${extra}
    <div class="image-container"><div class="image-anchor">
      <img class="tile-image w-100" src="https://img.example/${pid}_1.jpg?sw=481&amp;sh=481" alt="Plain Gold Ladies" title="x" />
    </div></div>
    <div class="detail-container"><div class="tile-body">
      <div class="pdp-link overflow-hidden"><p class="mb-0 link">${title}</p></div>
      <div class="short-description">  A gold piece &amp; more.  </div>
    </div>
    <div class="price"><span class="sales"><span class="value" content="${price}"></span> ₹</span></div>
    <span class="attr-size-length">Size/Length:
        14 </span>
    <button data-plpActionButtons="{&quot;ATS&quot;:true,&quot;availabilityMessage&quot;:&quot;Available&quot;}">Add</button>
  </div></a>
</div>`;

const html =
  tile("CKCJ_1", "Gold ring featuring laurel leaves", "45810.00", '<div class="best-seller">Best Seller</div>') +
  tile("CKCJ_2", "GOLD EAR CHAIN WITH CORAL DANGLERS", "193430.00") +
  tile("CKCJ_1", "duplicate", "1");

test("CKC grid tiles parse into products", () => {
  const [ring, ear, ...rest] = parseCkcGrid(html);
  assert.equal(rest.length, 0);
  assert.equal(ring.pid, "CKCJ_1");
  assert.equal(ring.price, 45810);
  assert.equal(ring.image, "https://img.example/CKCJ_1_1.jpg?sw=481&sh=481");
  assert.equal(ring.url, "https://www.ckcjewellers.com/en_IN/CKCJ_1.html");
  assert.equal(ring.size, "14");
  assert.equal(ring.description, "A gold piece & more.");
  assert.equal(ring.bestSeller, true);
  assert.equal(ear.name, "Gold ear chain with coral danglers");
  assert.equal(ear.bestSeller, false);
});

test("CKC categories come from the title", () => {
  assert.equal(ckcCategory("Gold ear chain with jade"), "Ear chains");
  assert.equal(ckcCategory("Gold chain featuring bulb pattern"), "Chains");
  assert.equal(ckcCategory("Gold ear studs feather"), "Earrings");
  assert.equal(ckcCategory("Gold bangles angular"), "Bangles");
  assert.equal(ckcCategory("Gold ring laurel"), "Rings");
  assert.equal(ckcCategory("Something else"), "Gold jewellery");
});

test("Product details add weight and gallery", () => {
  const detail = parseCkcDetail({
    product: { netMetalWeight: "2.860", grossItemWeight: "3.1", Purity: "", available: true, availabilityMessage: "Available", images: { large: [{ url: "https://img/1" }, { url: "bad" }] } },
  });
  assert.equal(detail.weight, 2.86);
  assert.deepEqual(detail.images, ["https://img/1"]);
  assert.equal(detail.purity, null);
  const [ring, ear] = ckcToItems(parseCkcGrid(html), { CKCJ_1: detail, CKCJ_2: { available: false } });
  assert.equal(ring.weight, 2.86);
  assert.equal(ring.purity, "—");
  assert.equal(ring.status, "Available");
  assert.equal(ring.category, "Rings");
  assert.equal(ring.source, "api");
  assert.match(ring.variant, /2\.86 g · Size 14 · Best seller/);
  assert.equal(ear.status, "Out of stock");
  assert.equal(ear.weight, null);
});

test("Catalogue keeps tiles when detail calls fail", async () => {
  const fetchImpl = async (url) => {
    if (url.includes("Search-UpdateGrid")) return new Response(html, { status: 200 });
    throw new Error("detail down");
  };
  const items = await fetchCkcCatalog({ limit: 10, fetchImpl });
  assert.equal(items.length, 2);
  assert.equal(items[0].image, "https://img.example/CKCJ_1_1.jpg?sw=481&sh=481");
});

test("Empty grid is an error", async () => {
  const fetchImpl = async () => new Response("<div>no products</div>", { status: 200 });
  await assert.rejects(fetchCkcCatalog({ fetchImpl }));
});
