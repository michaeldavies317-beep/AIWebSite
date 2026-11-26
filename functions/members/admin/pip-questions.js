// GET /members/admin/pip-questions?month=2026-11 -> the questions people asked Pip that month.
// Add &format=csv to download a spreadsheet file.
// This sits under /members/admin, so Cloudflare Access only lets Mike in.
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export async function onRequestGet({ request, env }) {
  if (!request.headers.get('cf-access-authenticated-user-email')) return json({ error: 'Please sign in' }, 403);
  if (!env.PIP_DB) return json({ configured: false, rows: [] });
  const url = new URL(request.url);
  const month = /^\d{4}-\d{2}$/.test(url.searchParams.get('month') || '') ? url.searchParams.get('month') : new Date().toISOString().slice(0, 7);
  let rows = [];
  try {
    const r = await env.PIP_DB.prepare('SELECT day, section, question, answered, over_limit FROM questions WHERE substr(day, 1, 7) = ? ORDER BY day DESC, id DESC').bind(month).all();
    rows = r.results || [];
  } catch (e) { rows = []; /* table not created yet: nobody has asked anything */ }
  if (url.searchParams.get('format') === 'csv') {
    const cell = (v) => '"' + String(v).replace(/"/g, '""') + '"';
    const csv = ['Date,Section,Question,Pip had an answer,After free limit']
      .concat(rows.map(r => [r.day, r.section, r.question, r.answered ? 'Yes' : 'No', r.over_limit ? 'Yes' : 'No'].map(cell).join(',')))
      .join('\r\n');
    return new Response(csv, { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="pip-questions-' + month + '.csv"', 'cache-control': 'no-store' } });
  }
  return json({ configured: true, month, rows });
}
