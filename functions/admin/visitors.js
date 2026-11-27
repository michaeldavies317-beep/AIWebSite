// GET /admin/visitors?days=7|28 -> headline visitor numbers for the Visitors tab.
// Only served on the admin address (see _middleware.js), which Cloudflare Access locks to Mike.
//
// The numbers come from Cloudflare Web Analytics, which is cookie-free: it doesn't store anything
// on visitors' devices, doesn't follow people across sites, and doesn't keep IP addresses.
// Mike switches it on once in Cloudflare (Workers & Pages > aiwebsite > Metrics > Web Analytics).
//
// Reading the numbers needs a Cloudflare API token with "Account Analytics: Read":
//   CF_ANALYTICS_TOKEN (Secret, optional) or, if that isn't set, CF_API_TOKEN with that permission added.
// Plus CF_ACCOUNT_ID (already set).
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const clean = (v) => String(v || '').trim().replace(/^["']|["']$/g, '');
// Mike's own pages aren't counted.
const SKIP_HOST = /^admin(-dev)?\./;

const QUERY = `query($a: String!, $s: Date!, $e: Date!) { viewer { accounts(filter: { accountTag: $a }) {
  days: rumPageloadEventsAdaptiveGroups(limit: 2000, filter: { date_geq: $s, date_leq: $e }) { count sum { visits } dimensions { date requestHost } }
  pages: rumPageloadEventsAdaptiveGroups(limit: 300, orderBy: [count_DESC], filter: { date_geq: $s, date_leq: $e }) { count dimensions { requestHost requestPath } }
  refs: rumPageloadEventsAdaptiveGroups(limit: 300, orderBy: [count_DESC], filter: { date_geq: $s, date_leq: $e }) { count sum { visits } dimensions { requestHost refererHost } }
  places: rumPageloadEventsAdaptiveGroups(limit: 300, orderBy: [count_DESC], filter: { date_geq: $s, date_leq: $e }) { count dimensions { requestHost countryName } }
  devices: rumPageloadEventsAdaptiveGroups(limit: 100, orderBy: [count_DESC], filter: { date_geq: $s, date_leq: $e }) { count dimensions { requestHost deviceType } }
} } }`;

const top = (rows, key, n, val = (r) => r.count) => {
  const m = new Map();
  rows.forEach((r) => { const k = key(r); if (k) m.set(k, (m.get(k) || 0) + val(r)); });
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([name, count]) => ({ name, count }));
};

export async function onRequestGet({ request, env }) {
  const token = env.CF_ANALYTICS_TOKEN || env.CF_API_TOKEN;
  if (!env.CF_ACCOUNT_ID || !token) return json({ configured: false, reason: 'no-token' });
  const days = new URL(request.url).searchParams.get('days') === '28' ? 28 : 7;
  const end = new Date();
  const start = new Date(end.getTime() - (days - 1) * 864e5);
  const iso = (d) => d.toISOString().slice(0, 10);
  let d;
  try {
    const r = await fetch('https://api.cloudflare.com/client/v4/graphql', {
      method: 'POST',
      headers: { authorization: 'Bearer ' + clean(token), 'content-type': 'application/json' },
      body: JSON.stringify({ query: QUERY, variables: { a: clean(env.CF_ACCOUNT_ID), s: iso(start), e: iso(end) } }),
      signal: AbortSignal.timeout(10000),
    });
    d = await r.json().catch(() => ({}));
    if (!r.ok && !d.errors) return json({ configured: true, error: 'Cloudflare said ' + r.status });
  } catch (e) { return json({ configured: true, error: String(e && e.message || e).slice(0, 200) }); }
  if (d.errors && d.errors.length) {
    const msg = String(d.errors[0].message || '');
    if (/auth|permission|not authorized|access/i.test(msg)) return json({ configured: false, reason: 'no-permission', detail: msg.slice(0, 200) });
    return json({ configured: true, error: msg.slice(0, 200) });
  }
  const acc = d.data && d.data.viewer && d.data.viewer.accounts && d.data.viewer.accounts[0];
  if (!acc) return json({ configured: true, error: 'No data came back for this account' });
  const keep = (rows) => (rows || []).filter((r) => !SKIP_HOST.test(r.dimensions.requestHost || ''));

  const dayRows = keep(acc.days);
  const byDay = [];
  for (let i = 0; i < days; i++) {
    const day = iso(new Date(start.getTime() + i * 864e5));
    const rs = dayRows.filter((r) => r.dimensions.date === day);
    byDay.push({ day, views: rs.reduce((n, r) => n + r.count, 0), visits: rs.reduce((n, r) => n + ((r.sum && r.sum.visits) || 0), 0) });
  }
  const views = byDay.reduce((n, r) => n + r.views, 0);
  const visits = byDay.reduce((n, r) => n + r.visits, 0);
  const sites = top(dayRows, (r) => r.dimensions.requestHost, 5);
  const ownHost = (h) => /easystartai\.co\.uk$|pages\.dev$/.test(h || '');
  return json({
    configured: true,
    days,
    views,
    visits,
    byDay,
    sites,
    pages: top(keep(acc.pages), (r) => r.dimensions.requestPath, 10),
    from: top(keep(acc.refs).filter((r) => !ownHost(r.dimensions.refererHost)), (r) => r.dimensions.refererHost || 'Typed in or a bookmark', 8, (r) => (r.sum && r.sum.visits) || r.count),
    places: top(keep(acc.places), (r) => r.dimensions.countryName, 8),
    devices: top(keep(acc.devices), (r) => r.dimensions.deviceType, 4),
  });
}
