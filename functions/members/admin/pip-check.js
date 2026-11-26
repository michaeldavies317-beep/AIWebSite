// GET /members/admin/pip-check -> a plain report on the Pip question log, for fixing problems.
// Open it in the browser and send what it says to Claude. Only Mike can open it (Cloudflare Access).
const json = (o) => new Response(JSON.stringify(o, null, 2), { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const msg = (e) => String(e && e.message || e).slice(0, 300);

export async function onRequestGet({ request, env }) {
  const out = { signedIn: !!request.headers.get('cf-access-authenticated-user-email'), host: new URL(request.url).hostname, database: env.PIP_DB ? 'connected' : 'missing' };
  if (!env.PIP_DB) return json(out);
  const db = env.PIP_DB;
  try { out.today = (await db.prepare("SELECT date('now') AS d").first()).d; } catch (e) { out.todayError = msg(e); }
  try { out.tables = ((await db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()).results || []).map(r => r.name); } catch (e) { out.tablesError = msg(e); }
  try { out.totalQuestions = (await db.prepare('SELECT COUNT(*) AS n FROM questions').first()).n; } catch (e) { out.countError = msg(e); }
  try { out.latest = (await db.prepare('SELECT id, day, section, question FROM questions ORDER BY id DESC LIMIT 3').all()).results; } catch (e) { out.latestError = msg(e); }
  try {
    const m = new Date().toISOString().slice(0, 7);
    out.thisMonth = (await db.prepare('SELECT COUNT(*) AS n FROM questions WHERE substr(day, 1, 7) = ?1').bind(m).first()).n;
  } catch (e) { out.thisMonthError = msg(e); }
  return json(out);
}
