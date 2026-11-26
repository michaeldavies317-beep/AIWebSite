// GET /admin/list-log -> the last 50 automatic list changes made by /api/stripe-webhook.
// Only served on the admin address (see _middleware.js), which Cloudflare Access locks to Mike.
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export async function onRequestGet({ env }) {
  const setup = {
    webhookSecret: !!env.STRIPE_WEBHOOK_SECRET,
    listToken: !!env.CF_LIST_TOKEN,
    accountId: !!env.CF_ACCOUNT_ID,
    stripeReadKey: !!env.STRIPE_READ_KEY,
    database: !!env.PIP_DB,
  };
  if (!env.PIP_DB) return json({ setup, rows: [] });
  try {
    const r = await env.PIP_DB.prepare('SELECT at, event, email, list, result FROM list_log ORDER BY id DESC LIMIT 50').all();
    return json({ setup, rows: r.results || [] });
  } catch (e) {
    if (/no such table/i.test(String(e && e.message))) return json({ setup, rows: [] });
    return json({ setup, error: String(e && e.message || e).slice(0, 300), rows: [] });
  }
}
