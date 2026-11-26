// POST /api/stripe-webhook  <- Stripe calls this when something happens.
// - checkout.session.completed: add the buyer's email to the Zero Trust list named on the Payment Link
//   (metadata "add_to_list"), so they can open the members area straight away.
// - customer.subscription.deleted: the paid month has run out after a cancel, so take the email
//   off the Starter or Plus list.
// Every action is written to the "list_log" table in PIP_DB, shown on Mike's admin page.
//
// Settings in Cloudflare Pages (Preview for dev, Production at launch):
//   STRIPE_WEBHOOK_SECRET (secret)  the signing secret of the Stripe webhook (whsec_...)
//   CF_LIST_TOKEN        (secret)  Cloudflare API token with "Zero Trust: Edit" (only used here)
//   CF_ACCOUNT_ID        (text)    already set for the members library
//   STRIPE_READ_KEY      (secret)  restricted Stripe key (also used by the admin page); needs
//                                  Customers: Read and Products: Read for cancellations
// Nobody's email is ever removed if it is also on the "Mike" list (so Mike's own tests can't lock him out).
//
// Emails (optional, setup guide Part 11): if BREVO_API_KEY (secret) is set, a buyer who gets access
// is also sent a branded welcome email (once per order) and added to the matching Brevo mailing list
// for "New this month" emails. When a plan ends they're taken off that mailing list too.
// Email problems are logged but never stop the list change or make Stripe retry.

import { welcomeEmail, productKeyFor, PRODUCTS } from '../_email/templates.js';
import { brevo, senders } from '../_email/brevo.js';

const enc = new TextEncoder();
const ok = (msg) => new Response(msg || 'ok', { status: 200 });

// Which Zero Trust list a Payment Link tag or product name means. First match wins.
const LISTS = [
  [/no list/i, null],
  [/bundle|parent guide buyers/i, /parent|bundle/i],
  [/under.?10/i, /under.?10/i],
  [/10.?to.?13/i, /10.?(to|-)?.?13/i],
  [/family.?set.?up/i, /family.?set.?up/i],
  [/write.?like/i, /write.?like/i],
  [/\bcv\b/i, /\bcv\b/i],
  [/budget/i, /budget/i],
  [/hustle/i, /hustle/i],
  [/notes/i, /notes/i],
  [/plus/i, /plus/i],
  [/starter/i, /starter/i],
];
const listPatternFor = (text) => { const hit = LISTS.find(([re]) => re.test(text || '')); return hit ? hit[1] : undefined; };

async function verify(request, secret) {
  const sig = request.headers.get('stripe-signature') || '';
  const body = await request.text();
  const parts = Object.fromEntries(sig.split(',').map(p => p.split('=')).filter(p => p.length === 2).map(([k, v]) => [k.trim(), v.trim()]));
  const sigs = sig.split(',').filter(p => p.trim().startsWith('v1=')).map(p => p.trim().slice(3));
  const t = parts.t;
  if (!t || !sigs.length) return null;
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return null; // older than 5 minutes
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(t + '.' + body)));
  const hex = [...mac].map(b => b.toString(16).padStart(2, '0')).join('');
  return sigs.includes(hex) ? JSON.parse(body) : null;
}

async function log(env, event, email, list, result) {
  if (!env.PIP_DB) return;
  try {
    await env.PIP_DB.prepare('CREATE TABLE IF NOT EXISTS list_log (id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT NOT NULL, event TEXT NOT NULL, email TEXT, list TEXT, result TEXT)').run();
    await env.PIP_DB.prepare("INSERT INTO list_log (at, event, email, list, result) VALUES (datetime('now'), ?1, ?2, ?3, ?4)").bind(event, email || '', list || '', result).run();
  } catch (e) { /* logging must never break the webhook */ }
}

function cf(env) {
  const base = 'https://api.cloudflare.com/client/v4/accounts/' + env.CF_ACCOUNT_ID + '/gateway/lists';
  const call = async (path, init) => {
    const r = await fetch(base + path, { ...init, headers: { authorization: 'Bearer ' + env.CF_LIST_TOKEN, 'content-type': 'application/json' } });
    const d = await r.json().catch(() => ({}));
    if (!d.success) throw new Error('Cloudflare said: ' + ((d.errors || []).map(e => e.message).join('; ') || r.status));
    return d.result;
  };
  return {
    lists: () => call('?per_page=100'),
    items: async (id) => ((await call('/' + id + '/items?per_page=1000')) || []).map(i => String(i.value).toLowerCase()),
    add: (id, email) => call('/' + id, { method: 'PATCH', body: JSON.stringify({ append: [{ value: email }] }) }),
    remove: (id, email) => call('/' + id, { method: 'PATCH', body: JSON.stringify({ remove: [email] }) }),
  };
}

async function findList(api, pattern) {
  const all = (await api.lists()) || [];
  return all.find(l => /EMAIL/i.test(l.type || '') && !/mike|owner|admin|dev.?testers?/i.test(l.name) && pattern.test(l.name));
}

async function stripeGet(env, path) {
  const r = await fetch('https://api.stripe.com/v1/' + path, { headers: { authorization: 'Bearer ' + env.STRIPE_READ_KEY } });
  const d = await r.json();
  if (!r.ok) throw new Error('Stripe said: ' + (d.error && d.error.message || r.status));
  return d;
}

async function welcomeAndSync(env, site, s, email) {
  if (!env.BREVO_API_KEY) return;
  const key = productKeyFor((s.metadata && s.metadata.add_to_list) || '');
  if (!key || !PRODUCTS[key]) return log(env, 'welcome email', email, '', 'skipped: no welcome email for this product');
  const name = (s.customer_details && s.customer_details.name) || '';
  const first = String(name).trim().split(/\s+/)[0] || '';
  const api = brevo(env);
  const p = PRODUCTS[key];
  try { await api.addToList(email, p.list, first); await log(env, 'mailing list', email, p.list, 'added'); }
  catch (e) { await log(env, 'mailing list', email, p.list, 'NEEDS YOU: ' + String(e && e.message || e).slice(0, 160)); }
  // Once per order, even if Stripe sends the event twice.
  if (env.PIP_DB && s.id) {
    try {
      await env.PIP_DB.prepare('CREATE TABLE IF NOT EXISTS welcome_sent (session TEXT PRIMARY KEY, at TEXT NOT NULL)').run();
      const r = await env.PIP_DB.prepare("INSERT OR IGNORE INTO welcome_sent (session, at) VALUES (?1, datetime('now'))").bind(s.id).run();
      if (r.meta && r.meta.changes === 0) return log(env, 'welcome email', email, p.title, 'already sent for this order');
    } catch (e) { /* carry on and send */ }
  }
  try {
    const m = welcomeEmail(key, { site, name, email });
    await api.send({ sender: senders(env).welcome, to: email, name, subject: m.subject, html: m.html, text: m.text, tags: ['welcome', key] });
    await log(env, 'welcome email', email, p.title, 'sent');
  } catch (e) {
    if (env.PIP_DB && s.id) { try { await env.PIP_DB.prepare('DELETE FROM welcome_sent WHERE session = ?1').bind(s.id).run(); } catch (x) {} }
    await log(env, 'welcome email', email, p.title, 'NEEDS YOU: not sent. ' + String(e && e.message || e).slice(0, 160));
  }
}

async function onPurchase(env, s, site) {
  const email = String((s.customer_details && s.customer_details.email) || s.customer_email || '').trim().toLowerCase();
  const tag = (s.metadata && s.metadata.add_to_list) || '';
  if (s.payment_status !== 'paid') return log(env, 'purchase', email, tag, 'skipped: not paid yet');
  if (!email) return log(env, 'purchase', '', tag, 'NEEDS YOU: no email on the order');
  const pattern = listPatternFor(tag);
  if (pattern === null) return log(env, 'purchase', email, tag, 'nothing to do (no list for this product)');
  if (!pattern) return log(env, 'purchase', email, tag || '(no tag)', 'NEEDS YOU: the Payment Link has no add_to_list tag');
  const api = cf(env);
  const list = await findList(api, pattern);
  if (!list) return log(env, 'purchase', email, tag, 'NEEDS YOU: no Zero Trust list matches "' + tag + '"');
  if ((await api.items(list.id)).includes(email)) await log(env, 'purchase', email, list.name, 'already on the list');
  else { await api.add(list.id, email); await log(env, 'purchase', email, list.name, 'added'); }
  return welcomeAndSync(env, site, s, email);
}

async function unsubscribePlan(env, email, product) {
  if (!env.BREVO_API_KEY) return;
  const key = productKeyFor(product);
  if (key !== 'starter' && key !== 'plus') return;
  const listName = PRODUCTS[key].list;
  try { await log(env, 'mailing list', email, listName, await brevo(env).removeFromList(email, listName)); }
  catch (e) { await log(env, 'mailing list', email, listName, 'NEEDS YOU: remove by hand in Brevo. ' + String(e && e.message || e).slice(0, 140)); }
}

async function onCancelEnded(env, sub) {
  const custId = typeof sub.customer === 'string' ? sub.customer : sub.customer && sub.customer.id;
  if (!env.STRIPE_READ_KEY) return log(env, 'plan ended', custId, '', 'NEEDS YOU: STRIPE_READ_KEY not set, remove by hand');
  const cust = await stripeGet(env, 'customers/' + custId);
  const email = String(cust.email || '').trim().toLowerCase();
  const item = sub.items && sub.items.data && sub.items.data[0];
  const prodId = item && item.price && (typeof item.price.product === 'string' ? item.price.product : item.price.product.id);
  const product = prodId ? (await stripeGet(env, 'products/' + prodId)).name : '';
  const pattern = listPatternFor(product);
  if (!email) return log(env, 'plan ended', custId, product, 'NEEDS YOU: customer has no email');
  if (!pattern) return log(env, 'plan ended', email, product, 'NEEDS YOU: not sure which list, remove by hand');
  const api = cf(env);
  const all = (await api.lists()) || [];
  const mike = all.find(l => /mike|owner|admin/i.test(l.name));
  if (mike && (await api.items(mike.id)).includes(email)) return log(env, 'plan ended', email, product, 'kept: this email is on the Mike list');
  // Still paying for the same plan on another subscription? Then keep them.
  const others = await stripeGet(env, 'subscriptions?status=active&customer=' + custId);
  if ((others.data || []).some(o => o.id !== sub.id && (o.items.data || []).some(i => (typeof i.price.product === 'string' ? i.price.product : i.price.product.id) === prodId)))
    return log(env, 'plan ended', email, product, 'kept: they still have another active plan like this');
  const list = await findList(api, pattern);
  if (!list) return log(env, 'plan ended', email, product, 'NEEDS YOU: no Zero Trust list matches');
  if (!(await api.items(list.id)).includes(email)) await log(env, 'plan ended', email, list.name, 'was not on the list');
  else { await api.remove(list.id, email); await log(env, 'plan ended', email, list.name, 'removed'); }
  return unsubscribePlan(env, email, product);
}

export async function onRequestPost({ request, env }) {
  if (!env.STRIPE_WEBHOOK_SECRET) return new Response('not set up', { status: 503 });
  let event;
  try { event = await verify(request, env.STRIPE_WEBHOOK_SECRET); } catch (e) { event = null; }
  if (!event) return new Response('bad signature', { status: 400 });
  if (!env.CF_LIST_TOKEN || !env.CF_ACCOUNT_ID) { await log(env, event.type, '', '', 'NEEDS YOU: CF_LIST_TOKEN or CF_ACCOUNT_ID not set'); return ok('not configured'); }
  try {
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') await onPurchase(env, event.data.object, new URL(request.url).origin);
    else if (event.type === 'customer.subscription.deleted') await onCancelEnded(env, event.data.object);
    return ok();
  } catch (e) {
    await log(env, event.type, '', '', 'ERROR: ' + String(e && e.message || e).slice(0, 200));
    return new Response('error', { status: 500 }); // Stripe will try again later
  }
}
