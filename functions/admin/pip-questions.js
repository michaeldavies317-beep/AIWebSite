// GET /admin/pip-questions?month=2026-11 -> the questions people asked Pip that month.
// Add &format=csv to download a spreadsheet file.
// Only served on the admin address (see _middleware.js), which Cloudflare Access locks to Mike.
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

// Who is signed in? Access normally adds a header; on this site it often doesn't, so fall back to
// the Access sign-in token (same approach as /members/me). The real lock is the Access app on the admin address.
function emailFrom(request) {
  const h = request.headers.get('cf-access-authenticated-user-email');
  if (h) return h.trim().toLowerCase();
  const m = (request.headers.get('cookie') || '').match(/(?:^|;\s*)CF_Authorization=([^;]+)/);
  const jwt = request.headers.get('cf-access-jwt-assertion') || (m && m[1]) || '';
  try {
    const part = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const p = JSON.parse(atob(part + '='.repeat((4 - part.length % 4) % 4)));
    if (p.exp && p.exp * 1000 < Date.now()) return '';
    return String(p.email || '').trim().toLowerCase();
  } catch (e) { return ''; }
}

export async function onRequestGet({ request, env }) {
  if (!emailFrom(request)) return json({ error: 'Please sign in again (log out, then open this page)', signedIn: false }, 403);
  if (!env.PIP_DB) return json({ configured: false, rows: [] });
  const url = new URL(request.url);
  const month = /^\d{4}-\d{2}$/.test(url.searchParams.get('month') || '') ? url.searchParams.get('month') : new Date().toISOString().slice(0, 7);
  let rows = [];
  try {
    const r = await env.PIP_DB.prepare('SELECT day, section, question, answered, over_limit FROM questions WHERE substr(day, 1, 7) = ?1 ORDER BY day DESC, id DESC').bind(month).all();
    rows = r.results || [];
  } catch (e) {
    if (!/no such table/i.test(String(e && e.message))) return json({ configured: true, error: String(e && e.message || e).slice(0, 300), rows: [] });
    rows = []; /* table not created yet: nobody has asked anything */
  }
  if (url.searchParams.get('format') === 'csv') {
    const cell = (v) => '"' + String(v).replace(/"/g, '""') + '"';
    const csv = ['Date,Section,Question,Pip had an answer,After free limit']
      .concat(rows.map(r => [r.day, r.section, r.question, r.answered ? 'Yes' : 'No', r.over_limit ? 'Yes' : 'No'].map(cell).join(',')))
      .join('\r\n');
    return new Response(csv, { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="pip-questions-' + month + '.csv"', 'cache-control': 'no-store' } });
  }
  return json({ configured: true, month, rows });
}
