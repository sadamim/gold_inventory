"use client";

import { Panel } from "./ui";
import { money } from "../lib/reporting.mjs";

const STATUS_COLORS = {
  Available: "#1e4a7a",
  Reserved: "#7a96b8",
  "In transit": "#5a7eab",
  Quarantine: "#a8b4c4",
};

function conicGradient(segments) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (!total) return "conic-gradient(#e2e9ee 0 100%)";
  let acc = 0;
  const stops = segments
    .filter((s) => s.value > 0)
    .map((s) => {
      const start = (acc / total) * 100;
      acc += s.value;
      return `${s.color} ${start}% ${(acc / total) * 100}%`;
    });
  return `conic-gradient(${stops.join(", ")})`;
}

function statusCounts(items) {
  const order = ["Available", "Reserved", "In transit", "Quarantine"];
  return order.map((status) => ({
    status,
    count: items.filter((i) => i.status === status).length,
    color: STATUS_COLORS[status],
  }));
}

export default function DashboardCharts({ data }) {
  const total = data.items.length;
  const statuses = statusCounts(data.items);

  const branchValues = data.branches
    .map((b) => ({
      id: b.id,
      name: b.name,
      code: b.code,
      value: data.items
        .filter((i) => i.branchId === b.id && i.status !== "In transit")
        .reduce((sum, i) => sum + (Number(i.value) || 0), 0),
    }))
    .sort((a, b) => b.value - a.value);
  const maxBranchValue = Math.max(...branchValues.map((b) => b.value), 1);
  const barMaxPx = 92;

  return (
    <div className="dashboard-grid dashboard-grid-spotlight">
      <Panel compact title="Inventory composition" sub="By availability status">
        <div className="chart-layout chart-layout-compact">
          <div
            className="donut donut-sm"
            style={{ background: conicGradient(statuses.map((s) => ({ color: s.color, value: s.count }))) }}
            role="img"
            aria-label={`Inventory composition: ${statuses.map((s) => `${s.status} ${s.count}`).join(", ")}`}
          >
            <div className="donut-label">
              <strong>{total}</strong>
              <span>Total</span>
            </div>
          </div>
          <div className="chart-legend-list">
            {statuses.map((s) => (
              <div className="legend-row" key={s.status}>
                <i style={{ background: s.color }} />
                <span>{s.status}</span>
                <b>{String(s.count).padStart(2, "0")}</b>
                <small>{total ? Math.round((s.count / total) * 100) : 0}%</small>
              </div>
            ))}
          </div>
        </div>
      </Panel>
      <Panel compact title="Sample value by branch" sub="Sample INR · stock at branch">
        <div className="vbar-chart vbar-chart-compact" role="img" aria-label="Bar chart of sample inventory value by branch">
          {branchValues.map((b) => {
            const barPx = Math.max(4, Math.round((b.value / maxBranchValue) * barMaxPx));
            return (
              <div className="vbar-col" key={b.id}>
                <i style={{ height: `${barPx}px` }} title={money(b.value)} />
                <em>{b.code}</em>
                <small>{money(b.value)}</small>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
