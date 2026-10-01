"use client";
import { useState } from "react";
import { ALL_SECTIONS, ROLE_SECTIONS, SECTIONS, demoUsers } from "../lib/data.mjs";

const ROLES = Object.keys(ROLE_SECTIONS);
const initialsOf = (name) =>
  String(name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

export function staffProfiles(data) {
  return (
    data.staff ||
    demoUsers.map((u, index) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      branchId: index === 0 ? "all" : index === 1 ? "BR-001" : "BR-003",
      status: "Active",
      pages: ROLE_SECTIONS[u.role] || ALL_SECTIONS,
    }))
  );
}

// Sidebar sections this user may open. Missing settings fall back to the role default.
export function allowedSections(data, user) {
  const profile = staffProfiles(data).find((s) => s.id === user?.id || s.email?.toLowerCase() === user?.email?.toLowerCase());
  // Profiles saved before section access existed keep full access until edited.
  const pages = profile?.pages?.length ? profile.pages : ALL_SECTIONS;
  const list = ALL_SECTIONS.filter((id) => pages.includes(id));
  return list.length ? list : ["overview"];
}

// Demo sign-in accounts: test users plus any active staff profile that has a password.
export function loginAccounts(data) {
  const staff = staffProfiles(data);
  const accounts = demoUsers
    .filter((u) => staff.find((s) => s.id === u.id)?.status !== "Inactive")
    .map((u) => {
      const s = staff.find((p) => p.id === u.id);
      return s ? { ...u, name: s.name, role: s.role, initials: initialsOf(s.name), password: s.password || u.password } : u;
    });
  for (const s of staff) {
    if (s.status !== "Active" || !s.password || accounts.some((a) => a.id === s.id)) continue;
    accounts.push({ id: s.id, name: s.name, email: s.email, password: s.password, role: s.role, initials: initialsOf(s.name) });
  }
  return accounts;
}

function SectionPicker({ value, onChange }) {
  const all = value.length === ALL_SECTIONS.length;
  return (
    <fieldset className="section-picker">
      <legend>
        Visible sections{" "}
        <small>
          ({value.length} of {ALL_SECTIONS.length})
        </small>
      </legend>
      <div className="section-tools">
        <button type="button" onClick={() => onChange(all ? ["overview"] : ALL_SECTIONS)}>
          {all ? "Clear all" : "Select all"}
        </button>
        {ROLES.map((r) => (
          <button type="button" key={r} onClick={() => onChange(ROLE_SECTIONS[r])}>
            {r} preset
          </button>
        ))}
      </div>
      <div className="section-grid">
        {SECTIONS.map(([id, label]) => {
          const checked = value.includes(id);
          return (
            <label key={id} className={`section-option ${checked ? "on" : ""}`}>
              <input
                type="checkbox"
                checked={checked}
                onChange={() =>
                  onChange(checked ? value.filter((x) => x !== id) : ALL_SECTIONS.filter((x) => x === id || value.includes(x)))
                }
              />
              <span>{label}</span>
            </label>
          );
        })}
      </div>
      <p className="hint">Only the ticked sections appear in this user’s sidebar. Unticked pages are blocked even if opened by link.</p>
    </fieldset>
  );
}

export default function UsersPage({ data, user, update, notify }) {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null);
  const [pages, setPages] = useState(ALL_SECTIONS);
  const staff = staffProfiles(data);
  const branchName = (id) => (id === "all" ? "All branches" : data.branches.find((b) => b.id === id)?.name || "Unassigned");
  const labelOf = (id) => SECTIONS.find((s) => s[0] === id)?.[1] || id;
  function open(profile) {
    setEditing(profile);
    setPages(profile.pages?.length ? profile.pages : profile.id ? ALL_SECTIONS : ROLE_SECTIONS[profile.role || "Branch operator"]);
  }
  function save(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = String(f.get("name")).trim(),
      email = String(f.get("email")).trim().toLowerCase(),
      password = String(f.get("password") || "");
    if (!name || !email) return notify("Enter a name and email address.");
    if (staff.some((s) => s.id !== editing.id && s.email.toLowerCase() === email))
      return notify("This email is already in the staff list.");
    if (!pages.length) return notify("Select at least one section for this user.");
    if (password && password.length < 6) return notify("Password must be at least 6 characters.");
    const isSelf = editing.id === user.id;
    if (isSelf && !pages.includes("users")) return notify("Keep “Users” ticked on your own profile, or you will lose access to this page.");
    const record = {
      id: editing.id || crypto.randomUUID(),
      name,
      email,
      role: f.get("role"),
      branchId: f.get("branch"),
      status: isSelf ? "Active" : f.get("status"),
      pages: ALL_SECTIONS.filter((id) => pages.includes(id)),
      ...(password ? { password } : editing.password ? { password: editing.password } : {}),
    };
    update(
      (d) => ({
        ...d,
        staff: editing.id ? staffProfiles(d).map((s) => (s.id === editing.id ? record : s)) : [...staffProfiles(d), record],
      }),
      `${editing.id ? "Updated" : "Added"} user ${name} (${record.pages.length} sections)`,
    );
    setEditing(null);
    notify(
      editing.id ? "User saved." : password ? "User created. They can now sign in with this email and password." : "User profile created.",
    );
  }
  const rows = staff.filter((s) => `${s.name} ${s.email} ${branchName(s.branchId)} ${s.role}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">INVENTORY NEXUS / USERS</div>
          <h1>Users</h1>
          <p>Create users, assign their branch and choose which sidebar sections each person can see.</p>
        </div>
        <button className="primary" onClick={() => open({ role: "Branch operator" })}>
          Add user
        </button>
      </div>
      <div className="notice">
        Demo access control: settings are stored in this browser only. Use a secure identity provider and server-side permissions before
        using real data.
      </div>
      <div className="metrics">
        {[
          ["Users", staff.length],
          ["Active", staff.filter((s) => s.status === "Active").length],
          ["With limited access", staff.filter((s) => (s.pages || ALL_SECTIONS).length < ALL_SECTIONS.length).length],
        ].map(([label, value]) => (
          <div className="panel panel-body" key={label}>
            <h3>{label}</h3>
            <h2>{value}</h2>
          </div>
        ))}
      </div>
      {editing && (
        <section className="panel">
          <div className="panel-title">
            <h2>{editing.id ? `Edit ${editing.name}` : "New user"}</h2>
            <button onClick={() => setEditing(null)}>Cancel</button>
          </div>
          <form className="panel-body" onSubmit={save} key={editing.id || "new"}>
            <div className="form-grid">
              <label>
                Full name
                <input name="name" required maxLength={70} defaultValue={editing.name} />
              </label>
              <label>
                Email (used to sign in)
                <input name="email" type="email" required maxLength={100} defaultValue={editing.email} />
              </label>
              <label>
                {editing.id ? "New password (leave blank to keep)" : "Password"}
                <input name="password" type="password" minLength={6} maxLength={60} autoComplete="new-password" required={!editing.id} />
              </label>
              <label>
                Role
                <select
                  name="role"
                  defaultValue={editing.role || "Branch operator"}
                  onChange={(e) => {
                    if (!editing.id) setPages(ROLE_SECTIONS[e.target.value]);
                  }}
                >
                  {ROLES.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </label>
              <label>
                Branch
                <select name="branch" defaultValue={editing.branchId || "all"}>
                  <option value="all">All branches</option>
                  {data.branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Status
                <select name="status" defaultValue={editing.status || "Active"} disabled={editing.id === user.id}>
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </label>
            </div>
            <SectionPicker value={pages} onChange={setPages} />
            <button className="primary">{editing.id ? "Save user" : "Create user"}</button>
          </form>
        </section>
      )}
      <section className="panel">
        <div className="panel-title">
          <h2>All users</h2>
          <input
            aria-label="Search users"
            placeholder="Search name, email, role or branch"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>NAME / EMAIL</th>
                <th>ROLE</th>
                <th>BRANCH</th>
                <th>VISIBLE SECTIONS</th>
                <th>STATUS</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const visible = s.pages?.length ? s.pages : ALL_SECTIONS;
                return (
                  <tr key={s.id}>
                    <td>
                      <b>
                        {s.name}
                        {s.id === user.id ? " (you)" : ""}
                      </b>
                      <small>{s.email}</small>
                    </td>
                    <td>{s.role}</td>
                    <td>{branchName(s.branchId)}</td>
                    <td className="wrap">
                      {visible.length === ALL_SECTIONS.length ? (
                        <span className="badge">All sections</span>
                      ) : (
                        <div className="chip-list">
                          {visible.map((id) => (
                            <span key={id} className="chip">
                              {labelOf(id)}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${s.status === "Active" ? "" : "neutral"}`}>{s.status}</span>
                    </td>
                    <td>
                      <button onClick={() => open(s)}>Edit access</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!rows.length && <p className="panel-body">No users match your search.</p>}
      </section>
    </>
  );
}
