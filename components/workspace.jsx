"use client";

import UsersPage, { allowedSections, loginAccounts } from "./users-page";
import { CustomerOrders, OnlineStore, ServiceJobs, StockReceivedSheet } from "./operations";
import { Badge, Empty, Metric, Panel, Photo, csvDownload } from "./ui";
import StockAlerts from "./stock-alerts";
import { useEffect, useRef, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRight,
  ArrowLeftRight,
  Box,
  Building2,
  Check,
  CheckCheck,
  ChevronRight,
  CircleHelp,
  Clock3,
  Download,
  Globe2,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Truck,
  Users,
  Wrench,
  X,
  BarChart3,
  Eye,
  EyeOff,
  Mail,
  LockKeyhole,
} from "lucide-react";
import { SECTIONS, createSeed, demoUsers, jewellery, jewelleryImage, migrateBranches, migrateJewellery } from "../lib/data.mjs";
import { dateLabel, dateTime, money, PERIODS, summarizeTransfers } from "../lib/reporting.mjs";

const STORAGE = "global-inventory-next-v2";
const ICONS = {
  overview: LayoutDashboard,
  inventory: Box,
  branches: Building2,
  transfers: ArrowLeftRight,
  reservations: ShoppingBag,
  inward: Package,
  channels: RefreshCw,
  service: Wrench,
  audits: ShieldCheck,
  reports: BarChart3,
  users: Users,
};
const navigation = SECTIONS.map(([id, label]) => [id, label, ICONS[id]]);
// Live gold benchmark rates (24K / 22K / 18K) shown in the top header bar.
const HEADER_RATES = ["24K", "22K", "18K"];
function HeaderRates() {
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [details, setDetails] = useState(false);
  const alive = useRef(true),
    inflight = useRef(false),
    wrap = useRef(null);
  async function refresh() {
    if (inflight.current) return;
    inflight.current = true;
    setBusy(true);
    try {
      const r = await fetch("/api/metals", { cache: "no-store", signal: AbortSignal.timeout(15000) });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error || "Rates unavailable");
      if (alive.current) {
        setData(body);
        setError(body.error || "");
      }
    } catch {
      if (alive.current) setError("Live refresh unavailable. No new prices received.");
    } finally {
      inflight.current = false;
      if (alive.current) setBusy(false);
    }
  }
  useEffect(() => {
    alive.current = true;
    refresh();
    const timer = setInterval(refresh, 60000);
    return () => {
      alive.current = false;
      clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    if (!details) return;
    const close = (e) => {
      if (e.key === "Escape" || (e.type === "pointerdown" && !wrap.current?.contains(e.target))) setDetails(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [details]);
  const rate = (n) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);
  const status = error
    ? "Refresh unavailable"
    : data
      ? data.delayed
        ? "Delayed benchmark"
        : data.stale
          ? "Last available benchmark"
          : "Live"
      : "Connecting…";
  return (
    <div className="header-rates" ref={wrap}>
      <span className={`signal ${error || data?.delayed || data?.stale ? "warn" : ""}`} title={status} />
      <span className="header-rates-label">
        GOLD <small>₹/g</small>
      </span>
      {HEADER_RATES.map((label) => {
        const point = data?.gold?.find((x) => x.label === label);
        return (
          <span className="header-rate" key={label}>
            <em>{label}</em>
            <strong>{point ? "₹" + rate(point.value) : "—"}</strong>
          </span>
        );
      })}
      <button className="icon-button" onClick={refresh} disabled={busy} aria-label="Refresh gold rates" title="Refresh gold rates">
        <RefreshCw size={14} className={busy ? "spin" : ""} />
      </button>
      <button
        className="icon-button"
        onClick={() => setDetails(!details)}
        aria-expanded={details}
        aria-label="Gold rate sources and timestamps"
      >
        <CircleHelp size={15} />
      </button>
      {details && (
        <div className="rate-popover" role="dialog" aria-label="Gold rate details">
          <b>
            {status}
            {data && ` · ${dateTime(data.goldAt)} IST`}
          </b>
          <p>
            Gold API spot price (USD per troy ounce) × Frankfurter USD/INR reference rate ÷ 31.1034768 g, scaled by carat ÷ 24. Indicative
            estimates – excludes GST, import duty, premiums and making charges. Not a local jeweller quote.
          </p>
          <p>FX date: {data?.fxDate || "Unavailable"} · Refreshed every minute while open.</p>
          {error && (
            <p role="status">
              {error} {data ? "Showing the last successful update." : "No placeholder prices are shown."}
            </p>
          )}
          <div>
            <a href="https://gold-api.com/" target="_blank" rel="noreferrer">
              Gold API ↗
            </a>
            <a href="https://frankfurter.dev/" target="_blank" rel="noreferrer">
              Frankfurter ↗
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function Login({ onLogin, accounts }) {
  const [email, setEmail] = useState(demoUsers[0].email),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [visible, setVisible] = useState(false);
  function submit(e) {
    e.preventDefault();
    const user = accounts.find((u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password);
    if (!user) {
      setError("Email or password is incorrect, or the account is inactive.");
      return;
    }
    onLogin(user);
  }
  return (
    <div className="login-page">
      <div className="login-story">
        <a className="brand" href="#">
          <span className="brand-symbol">
            <Globe2 />
          </span>
          <span>
            Inventory<small>NEXUS</small>
          </span>
        </a>
        <div className="story-copy">
          <span className="overline">ONE WORKSPACE. EVERY LOCATION.</span>
          <h1>
            Good business
            <br />
            starts with a<br />
            <em>clearer view.</em>
          </h1>
          <p>
            Products, people and every handover.
            <br />
            Connected from one branch to the next.
          </p>
          <div className="story-chips">
            <span>
              <Building2 size={16} /> Branch intelligence
            </span>
            <span>
              <ShieldCheck size={16} /> Accountable handovers
            </span>
          </div>
        </div>
        <div className="login-product-grid">
          {jewellery.slice(0, 4).map((j) => (
            <Photo key={j.kind} item={{ name: j.name, image: jewelleryImage(j.kind) }} />
          ))}
        </div>
        <span className="login-foot">Built for the way your inventory moves.</span>
      </div>
      <div className="login-form-side">
        <div className="login-card">
          <span className="eyebrow">WELCOME TO YOUR WORKSPACE</span>
          <h2>Welcome back.</h2>
          <p>Sign in to keep everything moving.</p>
          <form onSubmit={submit}>
            <label>
              Email address
              <div className="input-icon">
                <Mail size={17} />
                <input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </label>
            <label>
              Password
              <div className="input-icon">
                <LockKeyhole size={17} />
                <input
                  type={visible ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => setVisible(!visible)}
                  aria-label={visible ? "Hide password" : "Show password"}
                >
                  {visible ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </label>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button className="primary login-submit">
              Sign in to workspace <ArrowRight size={18} />
            </button>
          </form>
          <div className="demo-login">
            <span className="badge neutral">DEMO ACCESS</span>
            <p>
              Select a test user to fill the form. Password: <code>Inventory123!</code>
            </p>
            <div className="test-users">
              {demoUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => {
                    setEmail(u.email);
                    setPassword(u.password);
                    setError("");
                  }}
                >
                  <span className="avatar">{u.initials}</span>
                  <span>
                    <b>{u.name}</b>
                    <small>{u.role}</small>
                  </span>
                  <ChevronRight size={15} />
                </button>
              ))}
            </div>
          </div>
          <p className="login-disclaimer">
            Test accounts only. This demo login does not secure real business data. Workspace changes are saved in this browser.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Workspace() {
  const [ready, setReady] = useState(false),
    [user, setUser] = useState(null),
    [data, setData] = useState(null),
    [routeState, setRoute] = useState("overview"),
    [menu, setMenu] = useState(false),
    [dialog, setDialog] = useState(null),
    [toast, setToast] = useState(""),
    [search, setSearch] = useState(""),
    [locationFilter, setLocationFilter] = useState("all"),
    [statusFilter, setStatusFilter] = useState("all"),
    [branchView, setBranchView] = useState("all"),
    [period, setPeriod] = useState("yesterday"),
    [reportBranch, setReportBranch] = useState("all"),
    [storageError, setStorageError] = useState("");
  const dialogRef = useRef(null),
    toastTimer = useRef(null);
  useEffect(() => {
    let saved;
    try {
      saved = JSON.parse(localStorage.getItem(STORAGE) || "null");
      if (saved?.version !== 2 || !["branches", "items", "transfers", "holds", "events"].every((k) => Array.isArray(saved[k])))
        saved = null;
    } catch {
      saved = null;
    }
    const loaded = saved ? migrateJewellery(migrateBranches(saved)) : createSeed();
    setData(loaded);
    try {
      setUser(loginAccounts(loaded).find((u) => u.id === sessionStorage.getItem("global-demo-user")) || null);
    } catch {}
    setReady(true);
    const sync = () => {
      const r = window.location.hash.slice(1);
      setRoute(navigation.some((n) => n[0] === r) ? r : "overview");
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  useEffect(() => {
    if (!ready || !data) return;
    try {
      localStorage.setItem(STORAGE, JSON.stringify(data));
      setStorageError("");
    } catch {
      setStorageError("Browser storage is unavailable or full. New changes will be lost on reload.");
    }
  }, [data, ready]);
  useEffect(() => {
    if (dialog && dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal();
    if (!dialog && dialogRef.current?.open) dialogRef.current.close();
  }, [dialog]);
  useEffect(() => () => clearTimeout(toastTimer.current), []);
  function notify(message) {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 4500);
  }
  function go(target) {
    if (data && user && !allowedSections(data, user).includes(target)) {
      notify("You do not have access to that section.");
      return;
    }
    window.location.hash = target;
    setRoute(target);
    setMenu(false);
    setDialog(null);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function login(u) {
    try {
      sessionStorage.setItem("global-demo-user", u.id);
    } catch {}
    setUser(u);
  }
  function logout() {
    try {
      sessionStorage.removeItem("global-demo-user");
    } catch {}
    setUser(null);
    setDialog(null);
    setMenu(false);
  }
  const branchName = (id) => data?.branches.find((b) => b.id === id)?.name || id;
  function update(fn, action) {
    setData((prev) => {
      const next = fn(prev);
      return {
        ...next,
        events: [{ id: crypto.randomUUID(), action, actor: user.name, at: new Date().toISOString() }, ...next.events].slice(0, 200),
      };
    });
  }
  function heading(title, sub, action) {
    return (
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            INVENTORY NEXUS <span>/</span> {navigation.find((n) => n[0] === route)?.[1]?.toUpperCase()}
          </div>
          <h1>{title}</h1>
          <p>{sub}</p>
        </div>
        <div className="heading-actions">{action}</div>
      </div>
    );
  }
  function showItem(id) {
    setDialog({ type: "item", id });
  }
  function inventoryExport() {
    csvDownload("inventory.csv", [
      ["Item", "Product", "Category", "Purity", "Weight g", "Branch", "Status", "Unit", "Sample value INR"],
      ...filteredItems.map((i) => [i.id, i.name, i.category, i.purity, i.weight, branchName(i.branchId), i.status, i.unit, i.value]),
    ]);
    notify("Inventory exported.");
  }
  function reserve(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      itemId = f.get("item"),
      item = data.items.find((i) => i.id === itemId);
    if (!item || item.status !== "Available") {
      notify("This item is no longer available.");
      return;
    }
    const customer = String(f.get("customer") || "").trim();
    if (!customer) {
      notify("Enter a customer reference.");
      return;
    }
    update(
      (d) => ({
        ...d,
        items: d.items.map((i) => (i.id === itemId ? { ...i, status: "Reserved" } : i)),
        holds: [
          {
            id: "RSV-" + Date.now(),
            itemId,
            channel: f.get("channel"),
            customer,
            phone: String(f.get("phone") || "").trim(),
            advance: Math.max(0, Number(f.get("advance")) || 0),
            value: item.value,
            state: Number(f.get("advance")) > 0 ? "Deposit received" : "Payment pending",
            createdAt: new Date().toISOString(),
          },
          ...d.holds,
        ],
      }),
      `Reserved ${itemId}`,
    );
    setDialog(null);
    notify("Reservation created. The item is now protected.");
  }
  function cancelHold(h) {
    if (h.state !== "Payment pending") return;
    update(
      (d) => ({
        ...d,
        holds: d.holds.map((x) => (x.id === h.id ? { ...x, state: "Cancelled" } : x)),
        items: d.items.map((i) => (i.id === h.itemId ? { ...i, status: "Available" } : i)),
      }),
      `Cancelled unpaid reservation ${h.id}`,
    );
    notify("Unpaid reservation cancelled.");
  }
  function createBranch(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = String(f.get("name")).trim(),
      code = String(f.get("code")).trim().toUpperCase();
    if (!name || !code || data.branches.some((b) => b.code === code || b.name.toLowerCase() === name.toLowerCase())) {
      notify("Enter a unique branch name and code.");
      return;
    }
    const branch = {
      id: "BR-" + Date.now(),
      name,
      code,
      country: String(f.get("country")).trim(),
      manager: String(f.get("manager")).trim(),
      email: String(f.get("email")).trim(),
      address: String(f.get("address")).trim(),
      type: f.get("type"),
      tone: "mint",
    };
    if (!branch.country || !branch.manager || !branch.address) {
      notify("Fill in the branch details.");
      return;
    }
    update((d) => ({ ...d, branches: [...d.branches, branch] }), `Created branch ${name}`);
    setDialog(null);
    notify("Branch created and saved in this browser.");
  }
  function requestTransfer(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const item = data.items.find((i) => i.id === f.get("item"));
    if (!item || item.status !== "Available") {
      notify("Select an available item.");
      return;
    }
    if (item.branchId === f.get("to")) {
      notify("Choose a different destination branch.");
      return;
    }
    if (data.transfers.some((t) => t.itemId === item.id && ["Requested", "In transit"].includes(t.status))) {
      notify("An open transfer already exists for this item.");
      return;
    }
    const sender = String(f.get("sender")).trim(),
      reason = String(f.get("reason")).trim();
    if (!sender || !reason) {
      notify("Sender and transfer reason are required.");
      return;
    }
    const t = {
      id: "TRF-" + Date.now(),
      itemId: item.id,
      itemName: item.name,
      from: item.branchId,
      to: f.get("to"),
      quantity: 1,
      value: item.value,
      sender,
      receiver: "",
      sentAt: null,
      receivedAt: null,
      createdAt: new Date().toISOString(),
      status: "Requested",
      seal: "",
      reason,
      historical: false,
      recordedBy: user.name,
    };
    update((d) => ({ ...d, transfers: [t, ...d.transfers] }), `Requested transfer ${t.id}`);
    setDialog(null);
    notify("Transfer requested. Dispatch confirmation is required before stock moves.");
  }
  function dispatchTransfer(e, t) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const item = data.items.find((i) => i.id === t.itemId);
    if (t.status !== "Requested" || !item || item.status !== "Available" || item.branchId !== t.from) {
      notify("The item is no longer eligible for dispatch.");
      return;
    }
    if (String(f.get("scan")).trim() !== t.itemId) {
      notify("The scanned item does not match this transfer.");
      return;
    }
    const sender = String(f.get("sender")).trim(),
      seal = String(f.get("seal")).trim();
    if (!sender || !seal) {
      notify("Sender name and package reference are required.");
      return;
    }
    const at = new Date().toISOString();
    update(
      (d) => ({
        ...d,
        items: d.items.map((i) => (i.id === t.itemId ? { ...i, status: "In transit" } : i)),
        transfers: d.transfers.map((x) =>
          x.id === t.id ? { ...x, sender, seal, status: "In transit", sentAt: at, dispatchedBy: user.name } : x,
        ),
      }),
      `Dispatched ${t.itemId} from ${branchName(t.from)}`,
    );
    setDialog(null);
    notify("Dispatch saved with sender and timestamp.");
  }
  function receiveTransfer(e, t) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (t.status !== "In transit") {
      notify("Only dispatched transfers can be received.");
      return;
    }
    if (String(f.get("scan")).trim() !== t.itemId) {
      notify("Wrong item ID. Check the dispatched item.");
      return;
    }
    const receiver = String(f.get("receiver")).trim();
    if (!receiver) {
      notify("Receiver name is required.");
      return;
    }
    if (!f.get("inspection")) {
      notify("Confirm the package and condition inspection.");
      return;
    }
    const at = new Date().toISOString();
    update(
      (d) => ({
        ...d,
        items: d.items.map((i) => (i.id === t.itemId ? { ...i, branchId: t.to, status: "Available" } : i)),
        transfers: d.transfers.map((x) =>
          x.id === t.id ? { ...x, receiver, receivedAt: at, status: "Received", receivedBy: user.name } : x,
        ),
      }),
      `Received ${t.itemId} at ${branchName(t.to)} by ${receiver}`,
    );
    setDialog(null);
    notify("Receipt saved. Item is available at the destination branch.");
  }
  if (!ready || !data)
    return (
      <div className="loading-page">
        <Globe2 className="spin" />
        <span>Opening your workspace…</span>
      </div>
    );
  if (!user) return <Login onLogin={login} accounts={loginAccounts(data)} />;
  const allowed = allowedSections(data, user);
  const route = allowed.includes(routeState) ? routeState : allowed[0] || "overview";
  const menuItems = navigation.filter(([id]) => allowed.includes(id));
  const firstManagement = menuItems.find(([id]) => navigation.findIndex((n) => n[0] === id) >= 6)?.[0];
  const filteredItems = data.items.filter(
    (i) =>
      (i.name + " " + i.id + " " + i.category).toLowerCase().includes(search.toLowerCase()) &&
      (locationFilter === "all" || i.branchId === locationFilter) &&
      (statusFilter === "all" || i.status === statusFilter),
  );
  const available = data.items.filter((i) => i.status === "Available"),
    held = data.items.filter((i) => i.status === "Reserved"),
    transit = data.items.filter((i) => i.status === "In transit");
  const totalValue = data.items.filter((i) => i.owner === "Company").reduce((sum, i) => sum + i.value, 0);
  const report = summarizeTransfers(data.transfers, data.branches, period, reportBranch);
  const activeBranch = data.branches.find((b) => b.id === branchView);
  const activeTransfers = data.transfers
    .filter((t) => branchView === "all" || t.from === branchView || t.to === branchView)
    .sort((a, b) => Date.parse(b.receivedAt || b.sentAt || b.createdAt) - Date.parse(a.receivedAt || a.sentAt || a.createdAt));
  const ItemTable = ({ items }) => (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>PRODUCT / ITEM</th>
            <th>PURITY · WEIGHT</th>
            <th>BRANCH</th>
            <th>SAMPLE VALUE</th>
            <th>AVAILABILITY</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id}>
              <td>
                <div className="product-cell">
                  <Photo item={i} />
                  <div>
                    <b>{i.name}</b>
                    <small>
                      {i.id} · {i.category}
                    </small>
                  </div>
                </div>
              </td>
              <td>
                {i.purity ? `${i.purity} · ${Number(i.weight).toFixed(2)} g` : i.variant}
                <small>
                  1 {String(i.unit).toLowerCase()}
                  {i.purity ? " · " + String(i.variant).split(" · ").slice(2).join(" · ") : ""}
                </small>
              </td>
              <td>
                {branchName(i.branchId)}
                <small>{i.status === "In transit" ? "In transit custody" : i.owner + " owned"}</small>
              </td>
              <td>{money(i.value)}</td>
              <td>
                <Badge>{i.status}</Badge>
              </td>
              <td>
                <button className="icon-button" onClick={() => showItem(i.id)} aria-label={`View ${i.name}`}>
                  <ArrowUpRight size={17} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!items.length && <Empty>No items match your filters.</Empty>}
    </div>
  );
  const TransferTable = ({ rows, actions = true }) => (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>TRANSFER / GOODS</th>
            <th>FROM → TO</th>
            <th>SENDER / DISPATCHED</th>
            <th>RECEIVER / RECEIVED</th>
            <th>STATUS</th>
            {actions && <th />}
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.id}>
              <td>
                <b>{t.id}</b>
                <small>
                  {t.itemName} · {t.quantity} unit{t.quantity !== 1 ? "s" : ""}
                </small>
              </td>
              <td>
                {branchName(t.from)} <ArrowRight size={12} className="inline-icon" /> {branchName(t.to)}
                <small>
                  {t.seal || "Not yet dispatched"}
                  {t.historical ? " · Historical demo" : ""}
                </small>
              </td>
              <td>
                <b>{t.sender}</b>
                <small>
                  {dateTime(t.sentAt)}
                  {t.sentAt ? " IST" : ""}
                </small>
              </td>
              <td>
                <b>{t.receiver || "Awaiting receiver"}</b>
                <small>
                  {dateTime(t.receivedAt)}
                  {t.receivedAt ? " IST" : ""}
                </small>
              </td>
              <td>
                <Badge>{t.status}</Badge>
              </td>
              {actions && (
                <td>
                  <button className="text-button" onClick={() => setDialog({ type: "transfer", id: t.id })}>
                    {t.status === "In transit" ? "Receive" : t.status === "Requested" ? "Dispatch" : "Details"} <ChevronRight size={14} />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <Empty>No transfer activity in this selection.</Empty>}
    </div>
  );
  const stats = (
    <div className="metrics">
      <Metric label="Registered stock" value={data.items.length} sub={`Across ${data.branches.length} branches`} icon={Package} />
      <Metric label="Available to sell" value={available.length} sub="Eligible for central reservation" icon={CheckCheck} />
      <Metric label="Inventory value" value={money(totalValue)} sub="Company-owned · sample INR value" icon={BarChart3} />
      <Metric label="In transit" value={transit.length} sub="Protected until receipt is confirmed" icon={Truck} tone="accent" />
    </div>
  );

  return (
    <div className={`app ${menu ? "menu-open" : ""}`}>
      <aside className="sidebar">
        <a className="brand" href="#overview" onClick={() => go("overview")}>
          <span className="brand-symbol">
            <Globe2 />
          </span>
          <span>
            Inventory<small>NEXUS</small>
          </span>
        </a>
        <div className="workspace-label">OPERATIONS WORKSPACE</div>
        <nav>
          {menuItems.map(([id, label, Icon], i) => (
            <div key={id}>
              {i > 0 && id === firstManagement && <div className="nav-section">MANAGEMENT</div>}
              <a
                href={"#" + id}
                onClick={() => go(id)}
                className={route === id ? "active" : ""}
                aria-current={route === id ? "page" : undefined}
              >
                <Icon size={18} />
                <span>{label}</span>
                {id === "transfers" && transit.length > 0 && <em>{transit.length}</em>}
              </a>
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="workspace-status">
            <span className="signal" />
            <div>
              Demo workspace<small>Saved on this device</small>
            </div>
            <ShieldCheck size={17} />
          </div>
          <div className="profile">
            <span className="avatar">{user.initials}</span>
            <div>
              <b>{user.name}</b>
              <small>{user.role}</small>
            </div>
            <button onClick={logout} className="icon-button" aria-label="Sign out">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
      {menu && <button className="menu-backdrop" onClick={() => setMenu(false)} aria-label="Close navigation" />}
      <div className="shell">
        <header>
          <div className="header-left">
            <button className="icon-button mobile-menu" onClick={() => setMenu(!menu)} aria-label="Toggle navigation">
              <Menu size={22} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={13} />
            <b>{navigation.find((n) => n[0] === route)?.[1]}</b>
          </div>
          <HeaderRates />
          <div className="header-right">
            <span className="demo-tag">DEMO DATA</span>
            <span className="date-header">{dateLabel(new Date())}</span>
            <span className="avatar">{user.initials}</span>
            <button className="icon-button mobile-logout" onClick={logout} aria-label="Sign out">
              <LogOut size={17} />
            </button>
          </div>
        </header>
        {storageError && (
          <div className="storage-warning" role="alert">
            {storageError}
          </div>
        )}
        <main key={route}>
          {route === "overview" && (
            <>
              {heading(
                "Dashboard",
                "See total stock, available items and recent transfers at a glance.",
                <>
                  <button onClick={() => go("reports")}>
                    <BarChart3 size={16} /> View reports
                  </button>
                  <button className="primary" onClick={() => setDialog({ type: "newTransfer" })}>
                    <Plus size={17} /> New transfer
                  </button>
                </>,
              )}
              {stats}
              <StockAlerts
                data={data}
                onOrders={() => go("reservations")}
                update={update}
                onBranch={(id) => {
                  setLocationFilter(id);
                  setStatusFilter("all");
                  setSearch("");
                  go("inventory");
                }}
                onItem={showItem}
                onTransfer={(id) => setDialog({ type: "transfer", id })}
              />
              <div className="feature-heading">
                <div>
                  <h2>Your collection, connected.</h2>
                  <p>Every piece of jewellery, tracked across your branches.</p>
                </div>
                <button className="text-button" onClick={() => go("inventory")}>
                  Explore inventory <ArrowRight size={16} />
                </button>
              </div>
              <div className="product-grid">
                {data.items.slice(0, 4).map((i) => (
                  <button className="product-card" key={i.id} onClick={() => showItem(i.id)}>
                    <div className="product-cover">
                      <Photo large item={i} />
                      <Badge>{i.status}</Badge>
                      <span className="product-arrow">
                        <ArrowUpRight size={18} />
                      </span>
                    </div>
                    <div className="product-info">
                      <span>{i.category}</span>
                      <h3>{i.name}</h3>
                      <div>
                        <small>{branchName(i.branchId)}</small>
                        <b>{money(i.value)}</b>
                      </div>
                      <p className="stock-caption">
                        Stock count: {i.status === "In transit" ? 0 : 1} · Available in this branch: {i.status === "Available" ? 1 : 0}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
              <div className="image-note">Illustrative jewellery images · Sample inventory values</div>
              <div className="two-col">
                <Panel
                  title="A network in motion"
                  sub="Physical stock at each branch"
                  action={
                    <button className="text-button" onClick={() => go("branches")}>
                      Branches <ArrowRight size={15} />
                    </button>
                  }
                >
                  {data.branches.map((b) => {
                    const n = data.items.filter((i) => i.branchId === b.id && i.status !== "In transit").length;
                    return (
                      <button
                        className="branch-bar"
                        key={b.id}
                        onClick={() => {
                          setBranchView(b.id);
                          go("branches");
                        }}
                      >
                        <span className={"branch-monogram " + b.tone}>{b.code}</span>
                        <div>
                          <b>{b.name}</b>
                          <small>{b.country}</small>
                        </div>
                        <span className="bar">
                          <i style={{ width: (Math.max(n, 0) / Math.max(data.items.length / 2, 1)) * 100 + "%" }} />
                        </span>
                        <strong>{n} units</strong>
                        <ChevronRight size={14} />
                      </button>
                    );
                  })}
                  <div className="panel-footer">{transit.length} item in transit, excluded from branch stock counts.</div>
                </Panel>
                <Panel title="Channel health" sub="Central availability and external publication">
                  <div className="channel-row">
                    <span className="round-icon">
                      <Building2 />
                    </span>
                    <div>
                      <b>Retail stores</b>
                      <small>Central reservation enabled</small>
                    </div>
                    <Badge>Connected</Badge>
                  </div>
                  <div className="channel-row">
                    <span className="round-icon">
                      <Globe2 />
                    </span>
                    <div>
                      <b>Online store</b>
                      <small>Simulated stock connection</small>
                    </div>
                    <Badge>Connected</Badge>
                  </div>
                  <div className="channel-row">
                    <span className="round-icon">
                      <RefreshCw />
                    </span>
                    <div>
                      <b>Reconciliation</b>
                      <small>{data.synced ? "All demo records aligned" : "One delayed availability event"}</small>
                    </div>
                    <Badge>{data.synced ? "Aligned" : "Review pending"}</Badge>
                  </div>
                  <div className="panel-footer">
                    <button className="text-button" onClick={() => go("channels")}>
                      Open channel workspace <ArrowRight size={15} />
                    </button>
                  </div>
                </Panel>
              </div>
              <Panel
                title="Latest handovers"
                sub="Sender, receiver and exact recorded time"
                action={
                  <button className="text-button" onClick={() => go("transfers")}>
                    All transfers <ArrowRight size={15} />
                  </button>
                }
              >
                <TransferTable
                  rows={[...data.transfers]
                    .sort((a, b) => Date.parse(b.receivedAt || b.createdAt) - Date.parse(a.receivedAt || a.createdAt))
                    .slice(0, 4)}
                />
              </Panel>
            </>
          )}
          {route === "inventory" && (
            <>
              {heading(
                "Stock",
                "Find products and check how many are available at each branch.",
                <>
                  <button onClick={inventoryExport}>
                    <Download size={16} /> Export stock
                  </button>
                  <button className="primary" onClick={() => setDialog({ type: "reserve" })}>
                    <Plus size={17} /> New order
                  </button>
                </>,
              )}
              {stats}
              <Panel title="Item inventory" sub={`${filteredItems.length} matching items`}>
                <div className="toolbar">
                  <label className="search-field">
                    <Search size={17} />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search jewellery, category or ID…"
                      aria-label="Search inventory"
                    />
                  </label>
                  <select aria-label="Inventory branch" value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)}>
                    <option value="all">All branches</option>
                    {data.branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                  <select aria-label="Inventory status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="all">All statuses</option>
                    {["Available", "Reserved", "In transit", "Quarantine"].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => {
                      setSearch("");
                      setLocationFilter("all");
                      setStatusFilter("all");
                    }}
                  >
                    Reset
                  </button>
                </div>
                <div className="notice">
                  <Package size={18} />
                  <span>
                    Stock count:{" "}
                    <b>
                      {
                        data.items.filter((i) => (locationFilter === "all" || i.branchId === locationFilter) && i.status !== "In transit")
                          .length
                      }
                    </b>{" "}
                    · {locationFilter === "all" ? "Available across all branches" : "Available in this branch"}:{" "}
                    <b>{available.filter((i) => locationFilter === "all" || i.branchId === locationFilter).length}</b>
                  </span>
                </div>
                <ItemTable items={filteredItems} />
              </Panel>
            </>
          )}
          {route === "branches" && (
            <>
              {heading(
                "Branches",
                "View branch stock, staff details and records of goods sent and received.",
                <button className="primary" onClick={() => setDialog({ type: "newBranch" })}>
                  <Plus size={17} /> Add branch
                </button>,
              )}
              <div className="branch-grid">
                {data.branches.map((b) => {
                  const stock = data.items.filter((i) => i.branchId === b.id && i.status !== "In transit");
                  return (
                    <button
                      className={`branch-card ${branchView === b.id ? "selected" : ""}`}
                      key={b.id}
                      onClick={() => setBranchView(b.id)}
                    >
                      <div className="branch-card-top">
                        <span className={"branch-monogram " + b.tone}>{b.code}</span>
                        <ArrowUpRight size={19} />
                      </div>
                      <h2>{b.name}</h2>
                      <p>
                        {b.country} · {b.type}
                      </p>
                      <div className="branch-manager">
                        <Users size={14} />
                        {b.manager}
                      </div>
                      <div className="branch-card-stats">
                        <div>
                          <b>{stock.length}</b>
                          <span>Stock count</span>
                        </div>
                        <div>
                          <b>{stock.filter((i) => i.status === "Available").length}</b>
                          <span>Available in this branch</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <Panel
                title={activeBranch ? `${activeBranch.name} · Branch records` : "All branch records"}
                sub="Handover times displayed in India Standard Time (IST)"
                action={
                  <select aria-label="Branch records filter" value={branchView} onChange={(e) => setBranchView(e.target.value)}>
                    <option value="all">All branches</option>
                    {data.branches.map((b) => (
                      <option value={b.id} key={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                }
              >
                {activeBranch && (
                  <div className="branch-contact">
                    <div>
                      <span>BRANCH MANAGER</span>
                      <b>{activeBranch.manager}</b>
                    </div>
                    <div>
                      <span>CONTACT</span>
                      <b>{activeBranch.email}</b>
                    </div>
                    <div>
                      <span>ADDRESS</span>
                      <b>{activeBranch.address}</b>
                    </div>
                    <div>
                      <span>BRANCH CODE</span>
                      <b>{activeBranch.code}</b>
                    </div>
                  </div>
                )}
                <TransferTable rows={activeTransfers} />
                <div className="panel-footer">Historical demo handovers are separate from the 16 current item records.</div>
              </Panel>
            </>
          )}
          {route === "transfers" && (
            <>
              {heading(
                "Stock Transfers",
                "Send goods to another branch and confirm when they arrive.",
                <button className="primary" onClick={() => setDialog({ type: "newTransfer" })}>
                  <Plus size={17} /> Request transfer
                </button>,
              )}
              <div className="metrics three">
                <Metric
                  label="Awaiting dispatch"
                  value={data.transfers.filter((t) => t.status === "Requested").length}
                  sub="Stock remains at the source branch"
                  icon={Package}
                />
                <Metric
                  label="On the move"
                  value={data.transfers.filter((t) => t.status === "In transit").length}
                  sub="Sender and dispatch time recorded"
                  icon={Truck}
                  tone="accent"
                />
                <Metric
                  label="Confirmed handovers"
                  value={data.transfers.filter((t) => t.status === "Received").length}
                  sub="Includes historical demo records"
                  icon={CheckCheck}
                />
              </div>
              <div className="journey">
                <span>
                  <span>01</span> Request
                </span>
                <ArrowRight />
                <span>
                  <span>02</span> Dispatch & sender
                </span>
                <ArrowRight />
                <span>
                  <span>03</span> Transit
                </span>
                <ArrowRight />
                <span>
                  <span>04</span> Receipt & receiver
                </span>
              </div>
              <Panel
                title="Transfer register"
                sub="Goods become available at the destination only after accepted receipt"
                action={
                  <select aria-label="Filter transfers by branch" value={branchView} onChange={(e) => setBranchView(e.target.value)}>
                    <option value="all">All branches</option>
                    {data.branches.map((b) => (
                      <option value={b.id} key={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                }
              >
                <TransferTable rows={activeTransfers} />
              </Panel>
            </>
          )}
          {route === "reports" && (
            <>
              {heading(
                "Reports",
                "See goods sent and received by branch for yesterday, last week, last month or last year.",
                <button
                  onClick={() => {
                    csvDownload(`branch-report-${period}.csv`, [
                      [
                        "Branch",
                        "Period start IST",
                        "Period end IST",
                        "Dispatched units",
                        "Received units",
                        "Dispatched value INR",
                        "Received value INR",
                        "Distinct transfers",
                      ],
                      ...report.rows.map((r) => [
                        r.name,
                        dateLabel(report.range.start),
                        dateLabel(new Date(Date.parse(report.range.end) - 1)),
                        r.outgoing,
                        r.incoming,
                        r.dispatchedValue,
                        r.receivedValue,
                        r.transfers,
                      ]),
                    ]);
                    notify("Selected branch report exported.");
                  }}
                >
                  <Download size={16} /> Export report
                </button>,
              )}
              <div className="report-controls">
                <div className="segmented">
                  {Object.entries(PERIODS).map(([id, label]) => (
                    <button aria-pressed={period === id} className={period === id ? "active" : ""} onClick={() => setPeriod(id)} key={id}>
                      {label}
                    </button>
                  ))}
                </div>
                <select aria-label="Report branch" value={reportBranch} onChange={(e) => setReportBranch(e.target.value)}>
                  <option value="all">All branches</option>
                  {data.branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="period-label">
                <Clock3 size={14} /> {dateLabel(report.range.start)} — {dateLabel(new Date(Date.parse(report.range.end) - 1))}{" "}
                <span>
                  IST ·{" "}
                  {period === "week"
                    ? "Previous Monday–Sunday"
                    : period === "year"
                      ? "Previous calendar year"
                      : period === "month"
                        ? "Previous calendar month"
                        : "Previous calendar day"}
                </span>
              </div>
              <div className="metrics">
                <Metric
                  label="Unique transfers"
                  value={report.uniqueTransfers}
                  sub="Counted once across the selected network"
                  icon={ArrowLeftRight}
                />
                <Metric label="Units dispatched" value={report.sent} sub="By dispatch timestamp" icon={ArrowUpRight} />
                <Metric label="Units received" value={report.received} sub="By receipt timestamp" icon={ArrowDownLeft} />
                <Metric
                  label="Dispatched value"
                  value={money(report.value)}
                  sub="Sample INR values · not sales revenue"
                  icon={BarChart3}
                  tone="accent"
                />
              </div>
              <div className="two-col report-layout">
                <Panel title="Branch movement comparison" sub="Units sent and received in the selected period">
                  <div className="chart-legend">
                    <span>
                      <i />
                      Dispatched
                    </span>
                    <span>
                      <i />
                      Received
                    </span>
                  </div>
                  {report.rows.map((b) => (
                    <div className="report-bar-row" key={b.id}>
                      <div>
                        <b>{b.name}</b>
                        <small>
                          {b.outgoing} sent · {b.incoming} received
                        </small>
                      </div>
                      <div className="double-bar">
                        <span>
                          <i
                            style={{
                              width: (b.outgoing / Math.max(1, ...report.rows.flatMap((r) => [r.incoming, r.outgoing]))) * 100 + "%",
                            }}
                          />
                        </span>
                        <span>
                          <i
                            style={{
                              width: (b.incoming / Math.max(1, ...report.rows.flatMap((r) => [r.incoming, r.outgoing]))) * 100 + "%",
                            }}
                          />
                        </span>
                      </div>
                    </div>
                  ))}
                </Panel>
                <div className="report-explainer">
                  <span className="round-icon">
                    <ShieldCheck />
                  </span>
                  <span className="eyebrow">A CLEARER ACCOUNT</span>
                  <h2>
                    One movement.
                    <br />
                    Two accountable branches.
                  </h2>
                  <p>Dispatch is counted at the source. Receipt is counted at the destination, using its own timestamp.</p>
                  <p>
                    Unique transfers are counted once, even when both events fall within the period. These are movement reports, not
                    historical stock-balance or sales reports.
                  </p>
                  <span className="badge neutral">SYNTHETIC HISTORY + YOUR DEMO CHANGES</span>
                </div>
              </div>
              <Panel title="Branch-by-branch detail" sub={`${report.rows.length} branches · ${PERIODS[period]}`}>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>BRANCH / MANAGER</th>
                        <th>DISPATCHED</th>
                        <th>RECEIVED</th>
                        <th>DISPATCH VALUE</th>
                        <th>RECEIPT VALUE</th>
                        <th>TRANSFERS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.rows.map((r) => (
                        <tr key={r.id}>
                          <td>
                            <b>{r.name}</b>
                            <small>{r.manager}</small>
                          </td>
                          <td>{r.outgoing}</td>
                          <td>{r.incoming}</td>
                          <td>{money(r.dispatchedValue)}</td>
                          <td>{money(r.receivedValue)}</td>
                          <td>{r.transfers}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
              <Panel
                title="Matching handover records"
                sub="Records with a dispatch or receipt inside the selected period"
                action={
                  <button
                    className="text-button"
                    onClick={() =>
                      csvDownload(`handovers-${period}.csv`, [
                        [
                          "Transfer",
                          "Product",
                          "Source",
                          "Destination",
                          "Sender",
                          "Dispatch time UTC",
                          "Receiver",
                          "Receipt time UTC",
                          "Status",
                        ],
                        ...report.relevant.map((t) => [
                          t.id,
                          t.itemName,
                          branchName(t.from),
                          branchName(t.to),
                          t.sender,
                          t.sentAt,
                          t.receiver,
                          t.receivedAt,
                          t.status,
                        ]),
                      ])
                    }
                  >
                    <Download size={15} /> Export handovers
                  </button>
                }
              >
                <TransferTable rows={report.relevant} />
              </Panel>
            </>
          )}
          {route === "reservations" && <CustomerOrders data={data} heading={heading} setDialog={setDialog} showItem={showItem} />}
          {route === "channels" && (
            <OnlineStore
              data={data}
              update={update}
              notify={notify}
              heading={heading}
              setDialog={setDialog}
              branchName={branchName}
              showItem={showItem}
            />
          )}
          {route === "inward" && (
            <StockReceivedSheet data={data} update={update} notify={notify} heading={heading} branchName={branchName} />
          )}
          {route === "service" && <ServiceJobs data={data} update={update} notify={notify} heading={heading} branchName={branchName} />}
          {route === "audits" && (
            <>
              {heading("Stock Checks & Approvals", "Review stock differences, approval requests and staff activity.")}
              <div className="two-col">
                <Panel title="September cycle count" sub="AUD-0031 · Indiranagar">
                  <div className="panel-body">
                    <Badge>Review pending</Badge>
                    <h3>Storage zone A</h3>
                    <p>4 baseline items · 3 verified · 1 recount pending.</p>
                    <div className="progress">
                      <i style={{ width: "75%" }} />
                    </div>
                    <div className="detail-row">
                      <span>Counter</span>
                      <b>Ravi Kumar</b>
                    </div>
                    <div className="detail-row">
                      <span>Independent reviewer</span>
                      <b>Meera Rao</b>
                    </div>
                    <button onClick={() => setDialog({ type: "variance" })}>Inspect variance</button>
                  </div>
                </Panel>
                <Panel title="Location correction" sub="APP-0072 · INV-2405">
                  <div className="panel-body">
                    <Badge>{data.approvalSent ? "Assigned to reviewer" : "Pending approval"}</Badge>
                    <h3>Shelf A → Rack B</h3>
                    <p>Requester: Ananya Kumar. Independent review is required; this demo does not approve the request automatically.</p>
                    <button
                      disabled={data.approvalSent}
                      onClick={() => {
                        update((d) => ({ ...d, approvalSent: true }), "Assigned location correction to independent reviewer");
                        notify("Assigned to Meera Rao for independent review.");
                      }}
                    >
                      Send for review
                    </button>
                  </div>
                </Panel>
              </div>
              <Panel title="Activity history" sub="Browser-local demo activity; not a tamper-proof production audit log">
                <div className="activity-list">
                  {data.events.map((e) => (
                    <div key={e.id}>
                      <span className="round-icon">
                        <Check size={16} />
                      </span>
                      <div>
                        <b>{e.action}</b>
                        <small>
                          {e.actor} · {dateTime(e.at)} IST
                        </small>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            </>
          )}
          {route === "users" && <UsersPage data={data} user={user} update={update} notify={notify} />}
        </main>
        <footer>
          <span>
            Inventory Nexus <i>Operations, beautifully connected.</i>
          </span>
          <span>Demo accounts & stock · Browser-local records · Metal rates from external feeds</span>
        </footer>
      </div>
      <dialog
        ref={dialogRef}
        onCancel={() => setDialog(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setDialog(null);
        }}
      >
        <div className="dialog-header">
          <span className="eyebrow">INVENTORY NEXUS</span>
          <button className="icon-button" onClick={() => setDialog(null)} aria-label="Close dialog">
            <X size={21} />
          </button>
        </div>
        {dialog && renderDialog()}
      </dialog>
      {toast && (
        <div className="toast" role="status">
          <CheckCheck size={18} />
          {toast}
        </div>
      )}
    </div>
  );

  function field(label, name, props = {}) {
    return (
      <label>
        {label}
        <input name={name} required {...props} />
      </label>
    );
  }
  function renderDialog() {
    const t = data.transfers.find((t) => t.id === dialog.id),
      i = data.items.find((i) => i.id === dialog.id);
    if (dialog.type === "item" && i)
      return (
        <>
          <Photo item={i} large />
          <h2>{i.name}</h2>
          <p className="muted">
            {i.id} · {i.category}
          </p>
          <Badge>{i.status}</Badge>
          <div className="detail-grid">
            {[
              ["Category", i.category],
              ["Purity", i.purity || "—"],
              ["Weight", i.weight ? Number(i.weight).toFixed(2) + " g" : "—"],
              ["Design details", String(i.variant).split(" · ").slice(2).join(" · ") || i.variant],
              ["Stock unit", i.unit],
              ["Stock count", i.status === "In transit" ? 0 : 1],
              ["Available in this branch", i.status === "Available" ? "1 unit" : "0 units"],
              ["Branch", branchName(i.branchId)],
              ["Ownership", i.owner],
              ["Sample value", money(i.value)],
              ["Original stock age", i.age + " days"],
              ["Custody", i.status === "In transit" ? "In transit" : "Branch storage"],
            ].map(([k, v]) => (
              <div key={k}>
                <span>{k}</span>
                <b>{v}</b>
              </div>
            ))}
          </div>
          <h3>Item history</h3>
          <div className="timeline">
            <p>
              Identity registered<small>Original receipt and identity retained</small>
            </p>
            <p>
              {i.status === "Quarantine" ? "Inspection pending" : "Quality inspection accepted"}
              <small>Inventory operations · Demo record</small>
            </p>
            {data.transfers
              .filter((t) => t.itemId === i.id)
              .map((t) => (
                <p key={t.id}>
                  {branchName(t.from)} → {branchName(t.to)}
                  <small>
                    Sent by {t.sender} · {dateTime(t.sentAt)} IST
                  </small>
                  <small>{t.receiver ? `Received by ${t.receiver} · ${dateTime(t.receivedAt)} IST` : "Receipt pending"}</small>
                </p>
              ))}
          </div>
          {i.status === "Available" && (
            <button className="primary" onClick={() => setDialog({ type: "reserve", id: i.id })}>
              Reserve this item <ShieldCheck size={17} />
            </button>
          )}
        </>
      );
    if (dialog.type === "reserve")
      return (
        <>
          <h2>New customer order</h2>
          <p>Reserve an available piece for a customer.</p>
          <form onSubmit={reserve}>
            <label>
              Available item
              <select name="item" defaultValue={dialog.id} required>
                {available.map((i) => (
                  <option value={i.id} key={i.id}>
                    {i.id} · {i.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Sales channel
              <select name="channel">
                <option>Website</option>
                <option>Retail store</option>
                <option>Store pickup</option>
                <option>Assisted sales</option>
              </select>
            </label>
            {field("Customer name", "customer", { maxLength: 60, placeholder: "e.g. Priya Menon" })}
            <div className="form-grid">
              {field("Phone", "phone", { maxLength: 20, required: false, inputMode: "tel" })}
              {field("Advance paid ₹", "advance", { type: "number", min: 0, step: 1, defaultValue: 0, required: false })}
            </div>
            <div className="notice">
              Demo holds persist in this browser. There is no automatic expiry or cross-device reservation service.
            </div>
            <button className="primary" disabled={!available.length}>
              Create order
            </button>
          </form>
        </>
      );
    if (dialog.type === "newBranch")
      return (
        <>
          <h2>Add a branch</h2>
          <p>Create a location for inventory and handover records.</p>
          <form onSubmit={createBranch}>
            <div className="form-grid">
              {field("Branch name", "name", { maxLength: 50, placeholder: "e.g. HSR Layout" })}
              {field("Branch code", "code", { maxLength: 6, placeholder: "e.g. HSR" })}
              {field("City / state", "country", { maxLength: 60, defaultValue: "Bengaluru, Karnataka" })}
              {field("Branch manager", "manager", { maxLength: 70 })}
            </div>
            {field("Contact email", "email", { type: "email", maxLength: 100 })}
            {field("Address", "address", { maxLength: 180 })}
            <label>
              Location type
              <select name="type">
                <option>Retail store</option>
                <option>Distribution hub</option>
                <option>Warehouse</option>
                <option>Retail & fulfilment</option>
              </select>
            </label>
            <button className="primary">Save branch</button>
          </form>
        </>
      );
    if (dialog.type === "newTransfer")
      return (
        <>
          <h2>Request a branch transfer</h2>
          <p>One tracked unit per request. Sender confirmation happens at dispatch.</p>
          <form onSubmit={requestTransfer}>
            <label>
              Available goods
              <select name="item" required>
                {available.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.id} · {i.name} · {branchName(i.branchId)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Destination branch
              <select name="to" required>
                {data.branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            {field("Sender name", "sender", { defaultValue: user.name, maxLength: 70 })}
            {field("Transfer reason", "reason", { placeholder: "e.g. Branch replenishment", maxLength: 180 })}
            <div className="notice">A request does not move goods. Dispatch and receipt each capture their own person name and time.</div>
            <button className="primary" disabled={!available.length || data.branches.length < 2}>
              Create transfer request
            </button>
          </form>
        </>
      );
    if (dialog.type === "transfer" && t)
      return (
        <>
          <h2>{t.id}</h2>
          <p>
            {t.itemName} · {branchName(t.from)} → {branchName(t.to)}
          </p>
          <Badge>{t.status}</Badge>
          <div className="detail-grid">
            {[
              ["Source branch", branchName(t.from)],
              ["Destination branch", branchName(t.to)],
              ["Sender", t.sender],
              ["Dispatch time (IST)", dateTime(t.sentAt)],
              ["Receiver", t.receiver || "Awaiting receiver"],
              ["Receipt time (IST)", dateTime(t.receivedAt)],
              ["Package / seal", t.seal || "Pending dispatch"],
              ["Recorded by", t.recordedBy],
            ].map(([k, v]) => (
              <div key={k}>
                <span>{k}</span>
                <b>{v}</b>
              </div>
            ))}
          </div>
          {t.status === "Requested" && (
            <form onSubmit={(e) => dispatchTransfer(e, t)}>
              {field("Confirm sender name", "sender", { defaultValue: t.sender, maxLength: 70 })}
              {field("Package / seal reference", "seal", { maxLength: 50 })}
              {field("Scan / enter exact item ID", "scan", { placeholder: t.itemId })}
              <label className="checkbox">
                <input type="checkbox" required /> Goods picked and packaging checked
              </label>
              <button className="primary">
                Confirm dispatch <Truck size={16} />
              </button>
            </form>
          )}
          {t.status === "In transit" && (
            <form onSubmit={(e) => receiveTransfer(e, t)}>
              {field("Receiver name at destination", "receiver", { defaultValue: user.name, maxLength: 70 })}
              {field("Scan / enter exact item ID", "scan", { placeholder: t.itemId })}
              <label className="checkbox">
                <input type="checkbox" name="inspection" required /> Correct goods, package and condition verified
              </label>
              <button className="primary">
                Confirm receipt <CheckCheck size={17} />
              </button>
            </form>
          )}
          <p className="fine-print">
            Times are captured from this device and shown in IST. Demo records are saved locally in this browser.
          </p>
        </>
      );
    if (dialog.type === "cancel") {
      const h = data.holds.find((h) => h.id === dialog.id);
      return (
        <>
          <h2>Cancel unpaid reservation?</h2>
          <p>
            {h.id} · {h.itemId}. This releases the unpicked item for another reservation.
          </p>
          <div className="dialog-actions">
            <button onClick={() => setDialog(null)}>Keep reservation</button>
            <button
              className="primary"
              onClick={() => {
                cancelHold(h);
                setDialog(null);
              }}
            >
              Cancel unpaid hold
            </button>
          </div>
        </>
      );
    }
    if (dialog.type === "sync")
      return (
        <>
          <h2>{data.synced ? "All sample records aligned" : "Review delayed availability"}</h2>
          <p>INV-2403 · Online store · EVT-0841</p>
          <div className="detail-grid">
            <div>
              <span>Central state</span>
              <b>Reserved · 0 available</b>
            </div>
            <div>
              <span>Expected event version</span>
              <b>8</b>
            </div>
            <div>
              <span>External version</span>
              <b>{data.synced ? "8" : "7"}</b>
            </div>
            <div>
              <span>Unmatched demo orders</span>
              <b>None</b>
            </div>
          </div>
          <div className="notice">This updates the demo connector record only. No external store is contacted.</div>
          <button
            className="primary"
            onClick={() => {
              update((d) => ({ ...d, synced: true }), "Replayed and verified demo availability event");
              setDialog(null);
              notify("Demo availability republished and verified.");
            }}
          >
            Reconcile demo event
          </button>
        </>
      );
    if (dialog.type === "payment")
      return (
        <>
          <h2>Payment exception · EXC-009</h2>
          <p>Website order WEB-3201 · Paid but unallocated</p>
          <div className="detail-grid">
            <div>
              <span>Payment reference</span>
              <b>PAY-DEMO-291</b>
            </div>
            <div>
              <span>Accountable owner</span>
              <b>Customer service + finance</b>
            </div>
          </div>
          <div className="notice">
            The newer reservation stays protected. Finance must verify payment and approve an alternative or refund. This prototype does not
            perform payment actions.
          </div>
        </>
      );
    if (dialog.type === "variance")
      return (
        <>
          <h2>Location mismatch · AUD-0031</h2>
          <p>INV-2405 · {branchName(data.items.find((x) => x.id === "INV-2405")?.branchId)}</p>
          <div className="detail-grid">
            <div>
              <span>Expected</span>
              <b>Shelf A</b>
            </div>
            <div>
              <span>Observed</span>
              <b>Rack B</b>
            </div>
          </div>
          <div className="notice">
            The original count is preserved. Independent recount and approval are required before a location correction.
          </div>
        </>
      );
    return (
      <>
        <h2>{dialog.title || dialog.id}</h2>
        <p>{dialog.id} · Read-only demo record</p>
        <div className="timeline">
          <p>
            {dialog.type === "service" ? "Intake and ownership captured" : "Purchase reference captured"}
            <small>Original identity and evidence retained</small>
          </p>
          <p>
            Inspection in progress<small>Condition, quantity and documentation checks</small>
          </p>
          <p>
            Review and disposition pending<small>Availability release is a separate authorised action</small>
          </p>
        </div>
        <div className="notice">This record demonstrates the workflow. It does not post real inventory or financial transactions.</div>
      </>
    );
  }
}
