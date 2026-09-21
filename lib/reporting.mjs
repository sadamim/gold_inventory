export const IST_OFFSET = 330 * 60 * 1000;
export const PERIODS = { yesterday: 'Yesterday', week: 'Last week', month: 'Last month', year: 'Last year' };
export function periodRange(period, now = new Date()) {
  if (!PERIODS[period]) throw new Error('Unknown report period');
  const local = new Date(new Date(now).getTime() + IST_OFFSET);
  const y = local.getUTCFullYear(), m = local.getUTCMonth(), d = local.getUTCDate();
  let end = Date.UTC(y, m, d), start;
  if (period === 'yesterday') start = end - 86400000;
  if (period === 'week') { end -= ((local.getUTCDay() + 6) % 7) * 86400000; start = end - 7 * 86400000; }
  if (period === 'month') { end = Date.UTC(y, m, 1); start = Date.UTC(y, m - 1, 1); }
  if (period === 'year') { end = Date.UTC(y, 0, 1); start = Date.UTC(y - 1, 0, 1); }
  return { start: new Date(start - IST_OFFSET).toISOString(), end: new Date(end - IST_OFFSET).toISOString() };
}
export function isWithin(date, range) { return !!date && Date.parse(date) >= Date.parse(range.start) && Date.parse(date) < Date.parse(range.end); }
export function summarizeTransfers(transfers, branches, period, branchId = 'all', now = new Date()) {
  const range = periodRange(period, now);
  const selected = branches.filter(b => branchId === 'all' || b.id === branchId);
  const relevant = transfers.filter(t => ((branchId === 'all' || t.from === branchId) && isWithin(t.sentAt, range)) || ((branchId === 'all' || t.to === branchId) && isWithin(t.receivedAt, range)));
  const rows = selected.map(b => {
    const outgoing = transfers.filter(t => t.from === b.id && isWithin(t.sentAt, range));
    const incoming = transfers.filter(t => t.to === b.id && isWithin(t.receivedAt, range));
    return { ...b, outgoing: outgoing.reduce((a,t)=>a+t.quantity,0), incoming: incoming.reduce((a,t)=>a+t.quantity,0), dispatchedValue: outgoing.reduce((a,t)=>a+t.value,0), receivedValue: incoming.reduce((a,t)=>a+t.value,0), transfers: new Set([...outgoing,...incoming].map(t=>t.id)).size };
  });
  return {range, rows, relevant, uniqueTransfers: relevant.length, sent: rows.reduce((s,r)=>s+r.outgoing,0), received: rows.reduce((s,r)=>s+r.incoming,0), value: rows.reduce((s,r)=>s+r.dispatchedValue,0)};
}
export const money = n => new Intl.NumberFormat('en-IN', {style:'currency',currency:'INR',maximumFractionDigits:0}).format(n);
export const dateTime = value => value ? new Intl.DateTimeFormat('en-IN',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Kolkata'}).format(new Date(value)) : 'Awaiting handover';
export const dateLabel = value => new Intl.DateTimeFormat('en-IN',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Kolkata'}).format(new Date(value));
