// POST /api/pip-log -> saves one question someone asked Pip, so Mike can spot
// common questions and turn them into tips and guides.
// Anonymous by design: no names, no IP address, no tracking ID. Emails and phone
// numbers are blanked out before saving. Rows older than 12 months are deleted.
// Needs a Cloudflare D1 database bound to this Pages project as PIP_DB.
// Until that is set up, this quietly does nothing.
const SECTIONS = ['business', 'personal', 'parents', 'other'];

export function redact(text) {
  return String(text || '')
    .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, '[email]')
    .replace(/(\+?\d[\d\s().-]{8,}\d)/g, '[number]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300);
}

export async function onRequestPost({ request, env }) {
  const done = new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });
  if (!env.PIP_DB) return done;
  let body;
  try { body = await request.json(); } catch (e) { return done; }
  const q = redact(body && body.q);
  if (q.length < 2) return done;
  const section = SECTIONS.includes(body.s) ? body.s : 'other';
  const answered = body.m ? 1 : 0;
  const overLimit = body.o ? 1 : 0;
  try {
    await env.PIP_DB.batch([
      env.PIP_DB.prepare('CREATE TABLE IF NOT EXISTS questions (id INTEGER PRIMARY KEY AUTOINCREMENT, day TEXT NOT NULL, section TEXT NOT NULL, question TEXT NOT NULL, answered INTEGER NOT NULL, over_limit INTEGER NOT NULL)'),
      env.PIP_DB.prepare('INSERT INTO questions (day, section, question, answered, over_limit) VALUES (date(\'now\'), ?, ?, ?, ?)').bind(section, q, answered, overLimit),
      env.PIP_DB.prepare('DELETE FROM questions WHERE day < date(\'now\', \'-12 months\')'),
    ]);
  } catch (e) { /* never break the chat because of the log */ }
  return done;
}
