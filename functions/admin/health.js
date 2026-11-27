// GET /admin/health -> the System health tab on the admin site.
// Only served on the admin address (see _middleware.js), which Cloudflare Access locks to Mike.
//
// It never sends back a secret's value. For each setting it only says whether it is there,
// and for each service it makes one small, free, read-only call to prove the key still works.
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const clean = (v) => String(v || '').trim().replace(/^["']|["']$/g, '');
const short = (e) => String(e && e.message || e).slice(0, 160);
const DEFAULT_DAILY_CAP = 200;

// What each setting is for, in plain words. "need" = the site needs it for something Mike uses.
const SETTINGS = [
  { name: 'ANTHROPIC_API_KEY', secret: true, what: "Pip's real AI answers" },
  { name: 'PIP_DB', binding: true, what: 'The database: Pip question log, daily limits, list change log' },
  { name: 'CF_ACCOUNT_ID', what: 'Your Cloudflare account number (used by the members library and list changes)' },
  { name: 'CF_API_TOKEN', secret: true, what: "Members library: reads the Zero Trust lists to show each member's plan" },
  { name: 'CF_LIST_TOKEN', secret: true, what: 'Automatic list changes: adds and removes members from Zero Trust lists' },
  { name: 'STRIPE_READ_KEY', secret: true, what: 'Recent purchases, and working out who to remove when a plan ends' },
  { name: 'STRIPE_WEBHOOK_SECRET', secret: true, what: 'Proves purchase messages really come from Stripe' },
  { name: 'BREVO_API_KEY', secret: true, what: 'Welcome emails, mailing lists and "New this month" drafts' },
  { name: 'CF_ANALYTICS_TOKEN', secret: true, optional: true, what: 'Optional. Visitor numbers on the Visitors tab (if not set, CF_API_TOKEN is used)' },
];

async function timed(fn) {
  const t = Date.now();
  try { const msg = await fn(); return { ok: true, msg, ms: Date.now() - t }; }
  catch (e) { return { ok: false, msg: short(e), ms: Date.now() - t }; }
}

async function cfLists(env, token) {
  const r = await fetch('https://api.cloudflare.com/client/v4/accounts/' + clean(env.CF_ACCOUNT_ID) + '/gateway/lists?per_page=100', { headers: { authorization: 'Bearer ' + clean(token) }, signal: AbortSignal.timeout(8000) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.success) throw new Error('Cloudflare said: ' + ((d.errors && d.errors[0] && d.errors[0].message) || r.status));
  return (d.result || []).length + ' Zero Trust lists can be read';
}

export async function onRequestGet({ env }) {
  const settings = SETTINGS.map((s) => ({ name: s.name, what: s.what, optional: !!s.optional, present: !!env[s.name] }));
  const db = env.PIP_DB;
  const checks = [];
  const add = async (name, what, needs, fn) => {
    const missing = needs.filter((n) => !env[n]);
    if (missing.length) return checks.push({ name, what, ok: null, msg: 'Not set up: ' + missing.join(', ') + ' missing' });
    checks.push({ name, what, ...(await timed(fn)) });
  };

  await Promise.all([
    add('Database', 'Cloudflare D1 (PIP_DB)', ['PIP_DB'], async () => { await db.prepare('SELECT 1').first(); return 'Connected'; }),
    add("Pip's AI", 'Anthropic', ['ANTHROPIC_API_KEY'], async () => {
      const r = await fetch('https://api.anthropic.com/v1/models?limit=1', { headers: { 'x-api-key': clean(env.ANTHROPIC_API_KEY), 'anthropic-version': '2026-10-21' }, signal: AbortSignal.timeout(8000) });
      if (r.status === 401) throw new Error('Anthropic did not accept the key');
      if (!r.ok) throw new Error('Anthropic said ' + r.status);
      return 'Key accepted (this check is free. "Check Pip\'s AI" on the Pip tab also proves there is credit)';
    }),
    add('Members library', 'Cloudflare Zero Trust (CF_API_TOKEN)', ['CF_ACCOUNT_ID', 'CF_API_TOKEN'], () => cfLists(env, env.CF_API_TOKEN)),
    add('Automatic list changes', 'Cloudflare Zero Trust (CF_LIST_TOKEN)', ['CF_ACCOUNT_ID', 'CF_LIST_TOKEN'], () => cfLists(env, env.CF_LIST_TOKEN)),
    add('Payments', 'Stripe (STRIPE_READ_KEY)', ['STRIPE_READ_KEY'], async () => {
      const r = await fetch('https://api.stripe.com/v1/checkout/sessions?limit=1', { headers: { authorization: 'Bearer ' + clean(env.STRIPE_READ_KEY) }, signal: AbortSignal.timeout(8000) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error('Stripe said: ' + ((d.error && d.error.message) || r.status));
      return /_test_/.test(clean(env.STRIPE_READ_KEY)) ? 'Working (TEST mode, no real money)' : 'Working (LIVE mode)';
    }),
    add('Purchase messages from Stripe', 'Stripe webhook (STRIPE_WEBHOOK_SECRET)', ['STRIPE_WEBHOOK_SECRET'], async () => {
      if (!clean(env.STRIPE_WEBHOOK_SECRET).startsWith('whsec_')) throw new Error("The secret doesn't look right (it should start with whsec_)");
      if (!db) return 'Secret is set. Last message unknown (no database)';
      try {
        const r = await db.prepare("SELECT at FROM list_log WHERE event IN ('purchase','plan ended') OR event LIKE 'checkout.%' OR event LIKE 'customer.%' ORDER BY id DESC LIMIT 1").first();
        return r ? 'Secret is set. Last message from Stripe: ' + r.at + ' UTC' : 'Secret is set. No messages from Stripe yet';
      } catch (e) { return 'Secret is set. No messages from Stripe yet'; }
    }),
    add('Emails', 'Brevo (BREVO_API_KEY)', ['BREVO_API_KEY'], async () => {
      const r = await fetch('https://api.brevo.com/v3/contacts/lists?limit=1&offset=0', { headers: { 'api-key': clean(env.BREVO_API_KEY), accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error('Brevo said: ' + (d.message || r.status));
      return 'Working (Brevo switches off keys that go unused for 90 days, and this check counts as use)';
    }),
  ]);
  const order = ['Database', "Pip's AI", 'Members library', 'Automatic list changes', 'Payments', 'Purchase messages from Stripe', 'Emails'];
  checks.sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));

  // Pip usage today (UTC day, same as the limit) against the site-wide cap.
  const cap = parseInt(env.PIP_DAILY_CAP, 10) || DEFAULT_DAILY_CAP;
  let pip = { cap, today: null, people: null, yesterday: null };
  let problems = [];
  if (db) {
    try {
      const t = await db.prepare("SELECT COALESCE(SUM(n),0) AS n, COUNT(*) AS people FROM pip_usage WHERE day = date('now')").first();
      const y = await db.prepare("SELECT COALESCE(SUM(n),0) AS n FROM pip_usage WHERE day = date('now','-1 day')").first();
      pip = { cap, today: t.n, people: t.people, yesterday: y.n };
    } catch (e) { pip = { cap, today: 0, people: 0, yesterday: 0 }; }
    try {
      const r = await db.prepare("SELECT at, event, email, list, result FROM list_log WHERE (result LIKE 'NEEDS YOU%' OR result LIKE 'ERROR%') AND at >= datetime('now','-30 days') ORDER BY id DESC LIMIT 20").all();
      problems = r.results || [];
    } catch (e) { problems = []; }
  }

  return json({ settings, checks, pip, problems, checkedAt: new Date().toISOString() });
}
