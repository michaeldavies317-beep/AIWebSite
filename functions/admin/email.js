// Mike's email tools on the admin address (locked to Mike by Cloudflare Access).
//   GET  /admin/email                       -> setup status + Brevo mailing lists
//   GET  /admin/email?preview=plus          -> shows the welcome email for that product in the browser
//   GET  /admin/email?news=parents&...      -> shows a "New this month" email (heading, intro, items JSON)
//   POST /admin/email {action:"setup"}      -> creates any missing Brevo mailing lists
//   POST /admin/email {action:"test", key}  -> sends that welcome email to Mike (the logged-in email)
//   POST /admin/email {action:"draft", ...} -> creates a "New this month" campaign DRAFT in Brevo.
//                                              Nothing is sent: Mike checks and sends it in Brevo.
import { welcomeEmail, newsEmail, PRODUCTS, AUDIENCES, ALL_LISTS } from '../_email/templates.js';
import { brevo, senders } from '../_email/brevo.js';

const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const html = (h) => new Response(h, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });

// The public site whose /email/ pictures and links the emails use.
const siteFor = (url) => (url.hostname === 'admin.easystartai.co.uk' ? 'https://easystartai.co.uk' : 'https://dev.easystartai.co.uk');
// Who is logged in: Access's header, or else the email inside the Access token (same as /members/me).
function mikeEmail(request) {
  const h = request.headers.get('cf-access-authenticated-user-email');
  if (h) return h.trim().toLowerCase();
  const m = (request.headers.get('cookie') || '').match(/(?:^|;\s*)CF_Authorization=([^;]+)/);
  const jwt = request.headers.get('cf-access-jwt-assertion') || (m && m[1]) || '';
  try {
    const part = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return String(JSON.parse(atob(part + '==='.slice((part.length + 3) % 4))).email || '').trim().toLowerCase();
  } catch (e) { return ''; }
}

function newsFrom(o, site) {
  const a = AUDIENCES[o.audience] || AUDIENCES.personal;
  const items = Array.isArray(o.items) ? o.items.slice(0, 8).map((i) => ({ title: String(i.title || '').slice(0, 120), url: String(i.url || '').slice(0, 200), blurb: String(i.blurb || '').slice(0, 200) })) : [];
  const safeUrl = (u) => (/^\/[^/]/.test(u) ? u : '/members/');
  return {
    audience: a,
    html: newsEmail(a.theme, { site, heading: String(o.heading || '').slice(0, 120), intro: String(o.intro || '').slice(0, 1200), pip: String(o.pip || '').slice(0, 200), items: items.map((i) => ({ ...i, url: safeUrl(i.url) })) }),
  };
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const site = siteFor(url);
  const key = url.searchParams.get('preview');
  if (key) {
    if (!PRODUCTS[key]) return html('<p>No email called ' + key.replace(/[^\w-]/g, '') + '</p>');
    return html(welcomeEmail(key, { site, name: 'Sam Example', email: 'sam@example.com' }).html);
  }
  if (url.searchParams.has('news')) {
    let items = [];
    try { items = JSON.parse(url.searchParams.get('items') || '[]'); } catch (e) {}
    return html(newsFrom({ audience: url.searchParams.get('news'), heading: url.searchParams.get('heading'), intro: url.searchParams.get('intro'), pip: url.searchParams.get('pip'), items }, site).html
      .replace(/\{\{ contact\.FIRSTNAME[^}]*\}\}/g, 'Sam').replace(/\{\{ unsubscribe \}\}/g, '#'));
  }
  const setup = { brevoKey: !!env.BREVO_API_KEY, database: !!env.PIP_DB, from: senders(env) };
  const products = Object.values(PRODUCTS).map((p) => ({ key: p.key, title: p.title, theme: p.theme, list: p.list }));
  const audiences = Object.entries(AUDIENCES).map(([k, a]) => ({ key: k, label: a.label, theme: a.theme, lists: a.lists }));
  if (!env.BREVO_API_KEY) return json({ setup, products, audiences, lists: [] });
  try {
    const lists = (await brevo(env).lists()).map((l) => ({ name: l.name, people: l.uniqueSubscribers != null ? l.uniqueSubscribers : l.totalSubscribers }));
    return json({ setup, products, audiences, lists, missing: ALL_LISTS.filter((n) => !lists.some((l) => l.name.toLowerCase() === n.toLowerCase())) });
  } catch (e) {
    return json({ setup, products, audiences, lists: [], error: String(e && e.message || e).slice(0, 200) });
  }
}

export async function onRequestPost({ request, env }) {
  if (!/application\/json/.test(request.headers.get('content-type') || '')) return json({ error: 'bad request' }, 400);
  if (!env.BREVO_API_KEY) return json({ error: 'BREVO_API_KEY is not set yet (setup guide Part 11).' }, 400);
  const site = siteFor(new URL(request.url));
  const o = await request.json().catch(() => ({}));
  const api = brevo(env);
  try {
    if (o.action === 'setup') {
      const made = await api.ensureLists(ALL_LISTS);
      return json({ ok: true, message: made.length ? 'Made these Brevo lists: ' + made.join(', ') : 'All the Brevo lists are already there.' });
    }
    if (o.action === 'test') {
      const to = mikeEmail(request);
      if (!to) return json({ error: 'Could not tell who you are. Open this page on the admin address.' }, 400);
      if (!PRODUCTS[o.key]) return json({ error: 'Unknown email' }, 400);
      const m = welcomeEmail(o.key, { site, name: 'Mike', email: to });
      await api.send({ sender: senders(env).welcome, to, subject: '[Test] ' + m.subject, html: m.html, text: m.text, tags: ['test'] });
      return json({ ok: true, message: 'Sent "' + m.subject + '" to ' + to + '. It can take a minute (check junk).' });
    }
    if (o.action === 'draft') {
      const subject = String(o.subject || '').trim().slice(0, 150);
      if (!subject) return json({ error: 'Please add a subject line.' }, 400);
      const n = newsFrom(o, site);
      const ids = [];
      for (const name of n.audience.lists) { const id = await api.listId(name); if (id) ids.push(id); }
      if (!ids.length) return json({ error: 'The Brevo list for this audience is missing. Press "Set up Brevo" first.' }, 400);
      const s = senders(env).news;
      const r = await api.call('/emailCampaigns', { method: 'POST', body: JSON.stringify({
        name: 'New this month: ' + n.audience.label + ' (' + new Date().toISOString().slice(0, 10) + ')',
        subject, previewText: String(o.intro || '').slice(0, 110), sender: s, replyTo: s.email,
        htmlContent: n.html, recipients: { listIds: ids } }) });
      return json({ ok: true, id: r.id, message: 'Draft saved in Brevo (Campaigns, "' + n.audience.label + '"). Open it there, send yourself a test, then press Schedule or Send.' });
    }
    return json({ error: 'Unknown action' }, 400);
  } catch (e) {
    return json({ error: String(e && e.message || e).slice(0, 300) }, 502);
  }
}
