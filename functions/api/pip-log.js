// POST /api/pip-log -> saves one question someone asked Pip, so Mike can spot
// common questions and turn them into tips and guides.
// Anonymous by design: no names, no IP address, no tracking ID. Emails and phone
// numbers are blanked out before saving. Rows older than 12 months are deleted.
// Needs a Cloudflare D1 database bound to this Pages project as PIP_DB.
// Until that is set up, this quietly does nothing.
const SECTIONS = ['business', 'personal', 'parents', 'other', 'test'];

export function redact(text) {
  return String(text || '')
    .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, '[email]')
    .replace(/(\+?\d[\d\s().-]{8,}\d)/g, '[number]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300);
}

export async function onRequestPost({ request, env }) {
  // The x-pip-log header says what happened, so the admin page's test button can show it.
  const reply = (status) => new Response(null, { status: 204, headers: { 'cache-control': 'no-store', 'x-pip-log': status } });
  if (!env.PIP_DB) return reply('no-database');
  let body;
  try { body = await request.json(); } catch (e) { return reply('bad-request'); }
  const q = redact(body && body.q);
  if (q.length < 2) return reply('empty');
  const section = SECTIONS.includes(body.s) ? body.s : 'other';
  const answered = body.m ? 1 : 0;
  const overLimit = body.o ? 1 : 0;
  try {
    await env.PIP_DB.prepare('CREATE TABLE IF NOT EXISTS questions (id INTEGER PRIMARY KEY AUTOINCREMENT, day TEXT NOT NULL, section TEXT NOT NULL, question TEXT NOT NULL, answered INTEGER NOT NULL, over_limit INTEGER NOT NULL)').run();
    await env.PIP_DB.prepare("INSERT INTO questions (day, section, question, answered, over_limit) VALUES (date('now'), ?1, ?2, ?3, ?4)").bind(section, q, answered, overLimit).run();
  } catch (e) {
    return reply('error: ' + String(e && e.message || e).slice(0, 200).replace(/[\r\n]/g, ' '));
  }
  try { await env.PIP_DB.prepare("DELETE FROM questions WHERE day < date('now', '-12 months')").run(); } catch (e) { /* tidy-up can wait */ }
  return reply('saved');
}
