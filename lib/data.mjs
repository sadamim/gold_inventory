import { periodRange } from "./reporting.mjs";
// Sidebar sections. Users can be limited to a subset of these in the Users page.
export const SECTIONS = [
  ["overview", "Dashboard"],
  ["inventory", "Stock"],
  ["branches", "Branches"],
  ["transfers", "Stock Transfers"],
  ["reservations", "Customer Orders"],
  ["inward", "Stock Received"],
  ["channels", "Online Store"],
  ["service", "Repair & Return Jobs"],
  ["audits", "Stock Checks & Approvals"],
  ["reports", "Reports"],
  ["users", "Users"],
];
export const ALL_SECTIONS = SECTIONS.map(([id]) => id);
export const ROLE_SECTIONS = {
  "Operations manager": ALL_SECTIONS,
  "Branch operator": ["overview", "inventory", "transfers", "reservations", "inward", "service"],
  "Stock reviewer": ["overview", "inventory", "audits", "reports"],
  "Sales staff": ["overview", "inventory", "reservations", "channels", "service"],
};
export const demoUsers = [
  { id: "user-1", name: "Ananya Kumar", email: "admin@global.demo", password: "Inventory123!", role: "Operations manager", initials: "AK" },
  { id: "user-2", name: "Arjun Rao", email: "indiranagar@global.demo", password: "Inventory123!", role: "Branch operator", initials: "AR" },
  { id: "user-3", name: "Meera Rao", email: "whitefield@global.demo", password: "Inventory123!", role: "Branch operator", initials: "MR" },
];
export const initialBranches = [
  {
    id: "BR-001",
    name: "Indiranagar",
    country: "Bengaluru, Karnataka",
    type: "Flagship store",
    manager: "Arjun Rao",
    email: "indiranagar@example.com",
    address: "Demo store, Indiranagar, Bengaluru",
    code: "IND",
    tone: "mint",
  },
  {
    id: "BR-002",
    name: "Koramangala",
    country: "Bengaluru, Karnataka",
    type: "Retail & fulfilment",
    manager: "Kavya Shetty",
    email: "koramangala@example.com",
    address: "Demo store, Koramangala, Bengaluru",
    code: "KOR",
    tone: "blue",
  },
  {
    id: "BR-003",
    name: "Whitefield",
    country: "Bengaluru, Karnataka",
    type: "Distribution hub",
    manager: "Meera Rao",
    email: "whitefield@example.com",
    address: "Demo hub, Whitefield, Bengaluru",
    code: "WFD",
    tone: "lilac",
  },
  {
    id: "BR-004",
    name: "Jayanagar",
    country: "Bengaluru, Karnataka",
    type: "Retail & fulfilment",
    manager: "Rohit Gowda",
    email: "jayanagar@example.com",
    address: "Demo store, Jayanagar, Bengaluru",
    code: "JAY",
    tone: "sand",
  },
];
// Rename only the original demo locations; preserve stock, handovers and custom branches.
export function migrateBranches(data) {
  const legacyNames = ["London", "New York", "Singapore", "Dubai"];
  const people = { "James Wilson": "Arjun Rao", "Emma Chen": "Kavya Shetty", "Omar Hassan": "Rohit Gowda", "Meera Shah": "Meera Rao" };
  const rename = (value) => people[value] || value;
  return {
    ...data,
    branches: data.branches.map((branch) => {
      branch = { ...branch, manager: rename(branch.manager) };
      const index = initialBranches.findIndex((b) => b.id === branch.id);
      if (index < 0 || branch.name !== legacyNames[index]) return branch;
      const { name, country, email, address, code } = initialBranches[index];
      return { ...branch, name, country, email, address, code };
    }),
    transfers: data.transfers.map((t) => ({
      ...t,
      sender: rename(t.sender),
      receiver: rename(t.receiver),
      recordedBy: rename(t.recordedBy),
      dispatchedBy: rename(t.dispatchedBy),
      receivedBy: rename(t.receivedBy),
    })),
    events: data.events.map((event) => ({
      ...event,
      actor: rename(event.actor),
      action: Object.entries(people).reduce((text, [before, after]) => text.replaceAll(before, after), event.action),
    })),
  };
}
// Jewellery catalogue used as demo stock. `image` can be any URL (for example an
// image URL stored with the product record); the bundled SVGs are used by default.
export const jewellery = [
  {
    name: "Temple Lakshmi Necklace",
    category: "Necklaces",
    purity: "22K",
    weight: 38.4,
    unit: "Piece",
    value: 412000,
    kind: "necklace",
    detail: "Antique finish · 16 in",
  },
  {
    name: "Diamond Solitaire Ring",
    category: "Rings",
    purity: "18K",
    weight: 4.2,
    unit: "Piece",
    value: 185000,
    kind: "ring",
    detail: "0.50 ct · Size 12",
  },
  {
    name: "Antique Jhumka Earrings",
    category: "Earrings",
    purity: "22K",
    weight: 12.6,
    unit: "Pair",
    value: 132000,
    kind: "jhumka",
    detail: "Pearl drops · Screw back",
  },
  {
    name: "Bridal Kada Bangles",
    category: "Bangles",
    purity: "22K",
    weight: 42.0,
    unit: "Pair",
    value: 448000,
    kind: "bangle",
    detail: "Size 2.6 · Openable",
  },
  {
    name: "Rope Chain",
    category: "Chains",
    purity: "22K",
    weight: 15.8,
    unit: "Piece",
    value: 162000,
    kind: "chain",
    detail: "20 in · Lobster clasp",
  },
  {
    name: "Lakshmi Gold Coin",
    category: "Coins",
    purity: "24K",
    weight: 10.0,
    unit: "Piece",
    value: 115000,
    kind: "coin",
    detail: "999.9 fine · Sealed pack",
  },
  {
    name: "Men's Signet Ring",
    category: "Rings",
    purity: "22K",
    weight: 8.3,
    unit: "Piece",
    value: 86000,
    kind: "signet",
    detail: "Matte top · Size 20",
  },
  {
    name: "Black Bead Mangalsutra",
    category: "Mangalsutra",
    purity: "22K",
    weight: 18.5,
    unit: "Piece",
    value: 194000,
    kind: "mangalsutra",
    detail: "Double line · 24 in",
  },
  {
    name: "Ruby Drop Pendant",
    category: "Pendants",
    purity: "18K",
    weight: 5.1,
    unit: "Piece",
    value: 72000,
    kind: "pendant",
    detail: "Natural ruby · With bail",
  },
  {
    name: "Diamond Stud Earrings",
    category: "Earrings",
    purity: "18K",
    weight: 3.4,
    unit: "Pair",
    value: 98000,
    kind: "stud",
    detail: "0.30 ct total · Push back",
  },
  {
    name: "Baby Nazariya Bracelet",
    category: "Bracelets",
    purity: "22K",
    weight: 6.2,
    unit: "Piece",
    value: 64000,
    kind: "bracelet",
    detail: "Black beads · Adjustable",
  },
  {
    name: "Floral Nose Pin",
    category: "Nose pins",
    purity: "18K",
    weight: 0.8,
    unit: "Piece",
    value: 12500,
    kind: "nosepin",
    detail: "CZ stones · Screw",
  },
  {
    name: "Polki Choker Set",
    category: "Necklaces",
    purity: "22K",
    weight: 54.2,
    unit: "Set",
    value: 586000,
    kind: "choker",
    detail: "Choker + earrings",
  },
  {
    name: "Long Haram Necklace",
    category: "Necklaces",
    purity: "22K",
    weight: 64.0,
    unit: "Piece",
    value: 668000,
    kind: "haram",
    detail: "Consignment · 30 in",
  },
  {
    name: "Diamond Tennis Bracelet",
    category: "Bracelets",
    purity: "18K",
    weight: 9.6,
    unit: "Piece",
    value: 248000,
    kind: "tennis",
    detail: "1.20 ct total · Box clasp",
  },
  {
    name: "Navaratna Ring",
    category: "Rings",
    purity: "22K",
    weight: 6.8,
    unit: "Piece",
    value: 79000,
    kind: "navaratna",
    detail: "Nine gems · Size 14",
  },
];
export const jewelleryImage = (kind) => `/assets/jewellery/${kind}.svg`;
// Old general-merchandise demo names, in the same order as `jewellery`.
const legacyProducts = [
  "Wireless Headphones",
  "Cotton T-shirt",
  "Office Chair",
  "Ceramic Dinner Set",
  "Cordless Drill",
  "Coffee Beans",
  "Running Shoes",
  "LED Desk Lamp",
  "Travel Backpack",
  "Yoga Mat",
  "USB-C Cable Pack",
  "Storage Basket",
  "Notebook Set",
  "Hand Soap Refill",
  "Water Bottle",
  "Air Purifier",
];
function jewelFields(j) {
  return {
    name: j.name,
    category: j.category,
    variant: `${j.purity} · ${j.weight.toFixed(2)} g · ${j.detail}`,
    purity: j.purity,
    weight: j.weight,
    unit: j.unit,
    value: j.value,
    image: jewelleryImage(j.kind),
    photo: null,
  };
}
export const initialItems = jewellery.map((j, i) => ({
  id: `INV-${2401 + i}`,
  ...jewelFields(j),
  branchId: initialBranches[i % 4].id,
  status: i === 2 || i === 7 ? "Reserved" : i === 10 ? "In transit" : i === 13 ? "Quarantine" : "Available",
  owner: i === 13 ? "Supplier" : "Company",
  age: [34, 62, 18, 92, 25, 114, 43, 145, 12, 67, 8, 42, 183, 5, 54, 98][i],
}));
const day = 86400000;
const isoDay = (now, offset) => new Date(now.getTime() + offset * day).toISOString().slice(0, 10);
export function seedReceipts(now = new Date()) {
  return [
    {
      id: "GRN-0418",
      date: isoDay(now, -6),
      supplier: "Shree Bullion Works",
      invoice: "SBW/2026/1182",
      item: "Temple Lakshmi Necklace",
      purity: "22K",
      pcs: 2,
      gross: 78.4,
      net: 76.8,
      rate: 10450,
      branchId: "BR-001",
      status: "Accepted",
    },
    {
      id: "GRN-0419",
      date: isoDay(now, -4),
      supplier: "Kalyan Chains Pvt Ltd",
      invoice: "KC-55120",
      item: "Rope Chain",
      purity: "22K",
      pcs: 6,
      gross: 95.1,
      net: 94.8,
      rate: 10450,
      branchId: "BR-002",
      status: "Accepted",
    },
    {
      id: "GRN-0420",
      date: isoDay(now, -3),
      supplier: "Mumbai Diamond House",
      invoice: "MDH-7741",
      item: "Diamond Stud Earrings",
      purity: "18K",
      pcs: 4,
      gross: 13.9,
      net: 13.6,
      rate: 8550,
      branchId: "BR-001",
      status: "Pending check",
    },
    {
      id: "GRN-0421",
      date: isoDay(now, -2),
      supplier: "Coimbatore Bangle Co.",
      invoice: "CBC/887",
      item: "Bridal Kada Bangles",
      purity: "22K",
      pcs: 3,
      gross: 126.6,
      net: 126.0,
      rate: 10450,
      branchId: "BR-003",
      status: "Short received",
    },
    {
      id: "GRN-0422",
      date: isoDay(now, -1),
      supplier: "MMTC-PAMP (consignment)",
      invoice: "MP-24K-3310",
      item: "Lakshmi Gold Coin",
      purity: "24K",
      pcs: 10,
      gross: 100.0,
      net: 100.0,
      rate: 11400,
      branchId: "BR-004",
      status: "Pending check",
    },
  ];
}
export function seedService(now = new Date()) {
  return [
    {
      id: "JOB-0101",
      type: "Repair",
      customer: "Lakshmi Narayan",
      phone: "98450 11223",
      item: "Rope Chain",
      weight: 15.6,
      issue: "Broken clasp – replace lobster lock",
      receivedAt: isoDay(now, -5),
      promisedAt: isoDay(now, -1),
      stage: 2,
      charge: 850,
      branchId: "BR-001",
    },
    {
      id: "JOB-0102",
      type: "Resize",
      customer: "Priya Menon",
      phone: "99001 44556",
      item: "Diamond Solitaire Ring",
      weight: 4.2,
      issue: "Size 12 → 14",
      receivedAt: isoDay(now, -3),
      promisedAt: isoDay(now, 2),
      stage: 1,
      charge: 600,
      branchId: "BR-002",
    },
    {
      id: "JOB-0103",
      type: "Return",
      customer: "Rahul Shetty",
      phone: "97400 88112",
      item: "Diamond Stud Earrings",
      weight: 3.4,
      issue: "Exchange – customer wants larger studs",
      receivedAt: isoDay(now, -2),
      promisedAt: isoDay(now, 1),
      stage: 1,
      charge: 0,
      branchId: "BR-001",
    },
    {
      id: "JOB-0104",
      type: "Polish",
      customer: "Anitha Gowda",
      phone: "96320 55778",
      item: "Bridal Kada Bangles",
      weight: 41.8,
      issue: "Re-polish & rhodium on stones",
      receivedAt: isoDay(now, -8),
      promisedAt: isoDay(now, 0),
      stage: 3,
      charge: 1200,
      branchId: "BR-004",
    },
    {
      id: "JOB-0105",
      type: "Repair",
      customer: "Suresh Kumar",
      phone: "90080 22334",
      item: "Antique Jhumka Earrings",
      weight: 12.4,
      issue: "Re-attach two pearl drops",
      receivedAt: isoDay(now, -12),
      promisedAt: isoDay(now, -6),
      stage: 4,
      charge: 450,
      branchId: "BR-003",
    },
    {
      id: "JOB-0106",
      type: "Return",
      customer: "Customer 042",
      phone: "—",
      item: "Ruby Drop Pendant",
      weight: 5.1,
      issue: "Online order returned – check hallmark & stone",
      receivedAt: isoDay(now, -1),
      promisedAt: isoDay(now, 3),
      stage: 0,
      charge: 0,
      branchId: "BR-002",
    },
  ];
}
// Upgrade data saved by earlier versions of the demo (general merchandise → jewellery).
export function migrateJewellery(data, now = new Date()) {
  const byId = Object.fromEntries(jewellery.map((j, i) => [`INV-${2401 + i}`, j]));
  const rename = (name) => {
    const index = legacyProducts.indexOf(name);
    return index >= 0 ? jewellery[index].name : name;
  };
  return {
    ...data,
    items: data.items.map((item) => {
      if (item.image) return item;
      const j = byId[item.id] || jewellery[legacyProducts.indexOf(item.name)];
      return j ? { ...item, ...jewelFields(j) } : { ...item, photo: null };
    }),
    transfers: data.transfers.map((t) => ({ ...t, itemName: rename(t.itemName) })),
    holds: data.holds.map((h, index) => ({
      createdAt: new Date(now.getTime() - (index + 1) * day).toISOString(),
      phone: "",
      advance: h.state === "Deposit received" ? 25000 : 0,
      ...h,
    })),
    receipts: data.receipts || seedReceipts(now),
    service: data.service || seedService(now),
    online: data.online || {},
  };
}
export function createSeed(now = new Date()) {
  const transfers = [];
  for (const [pi, period] of ["year", "month", "week", "yesterday"].entries()) {
    const range = periodRange(period, now);
    const start = Date.parse(range.start),
      end = Date.parse(range.end);
    for (let i = 0; i < 8; i++) {
      const from = initialBranches[i % 4],
        to = initialBranches[(i + 1 + (pi % 2)) % 4];
      const sentAt = new Date(start + (end - start) * ((i + 1) / 11)).toISOString();
      const receivedAt = new Date(Math.min(Date.parse(sentAt) + 3600000, end - 1000)).toISOString();
      const product = initialItems[(i + pi * 3) % 16];
      transfers.push({
        id: `TRF-H${pi}${i + 1}`,
        itemId: `HIST-${pi}${i + 1}`,
        itemName: product.name,
        from: from.id,
        to: to.id,
        quantity: 1,
        value: product.value,
        sender: from.manager,
        receiver: to.manager,
        sentAt,
        receivedAt,
        createdAt: sentAt,
        status: "Received",
        seal: `PKG-H${pi}${i + 1}`,
        reason: "Historical demo replenishment",
        historical: true,
        recordedBy: "Demo seed",
      });
    }
  }
  transfers.unshift({
    id: "TRF-0281",
    itemId: "INV-2411",
    itemName: "Baby Nazariya Bracelet",
    from: "BR-003",
    to: "BR-001",
    quantity: 1,
    value: 64000,
    sender: "Meera Rao",
    receiver: "",
    sentAt: new Date(now.getTime() - 3 * 3600000).toISOString(),
    receivedAt: null,
    createdAt: new Date(now.getTime() - 4 * 3600000).toISOString(),
    status: "In transit",
    seal: "SEAL-0841",
    reason: "Store replenishment",
    historical: false,
    recordedBy: "Meera Rao",
  });
  return {
    version: 2,
    branches: initialBranches,
    items: initialItems,
    transfers,
    holds: [
      {
        id: "RSV-1084",
        itemId: "INV-2403",
        channel: "Website",
        customer: "Customer 042",
        phone: "98860 12345",
        advance: 0,
        state: "Payment pending",
        createdAt: new Date(now.getTime() - day).toISOString(),
      },
      {
        id: "RSV-1085",
        itemId: "INV-2408",
        channel: "Retail store",
        customer: "Customer 017",
        phone: "99450 67890",
        advance: 25000,
        state: "Deposit received",
        createdAt: new Date(now.getTime() - 2 * day).toISOString(),
      },
    ],
    receipts: seedReceipts(now),
    service: seedService(now),
    online: {},
    events: [{ id: "EVT-1", action: "Demo workspace initialized", actor: "System", at: now.toISOString() }],
    synced: false,
    approvalSent: false,
  };
}
