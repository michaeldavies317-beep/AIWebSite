// GET /admin/purchases -> the most recent paid Stripe checkouts, with which Zero Trust list to add each buyer to.
// Only served on the admin address (see _middleware.js), which Cloudflare Access locks to Mike.
// Needs one setting in Cloudflare Pages: STRIPE_READ_KEY (secret), a Stripe *restricted* key with
// "Checkout Sessions: Read" only. Test key (rk_test_...) under Preview, live key (rk_live_...) under Production.
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

// Each Payment Link carries metadata add_to_list, which Stripe copies onto the checkout.
// Older checkouts (made before that was added) fall back to matching the product name.
const LIST_FOR = [
  [/bundle/i, 'Parent Bundle Buyers (was Parent Guide Buyers)'],
  [/under.?10/i, 'Guide Under 10'],
  [/10.?to.?13/i, 'Guide 10 to 13'],
  [/family.?set.?up/i, 'Guide Family Setup'],
  [/write like/i, 'Guide Write Like You'],
  [/\bcv\b/i, 'Guide CV Kit'],
  [/budget/i, 'Guide Budgeting'],
  [/hustle/i, 'Guide Side Hustle'],
  [/notes/i, 'Guide Notes to Actions'],
  [/set-?up session/i, 'No list - book their set-up session'],
  [/plus/i, 'Plus Members'],
  [/starter/i, 'Starter Members'],
];

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
  const key = env.STRIPE_READ_KEY;
  if (!key) return json({ configured: false, rows: [] });
  const url = 'https://api.stripe.com/v1/checkout/sessions?status=complete&limit=30&expand[]=data.line_items';
  let d;
  try {
    const r = await fetch(url, { headers: { authorization: 'Bearer ' + key } });
    d = await r.json();
    if (!r.ok) return json({ configured: true, error: (d.error && d.error.message || ('Stripe said ' + r.status)).slice(0, 300), rows: [] });
  } catch (e) { return json({ configured: true, error: String(e && e.message || e).slice(0, 300), rows: [] }); }
  const rows = (d.data || []).filter(s => s.payment_status === 'paid').map(s => {
    const items = (s.line_items && s.line_items.data) || [];
    const product = items.map(i => i.description).join(', ') || '(unknown)';
    const hit = LIST_FOR.find(([re]) => re.test(product));
    const c = s.customer_details || {};
    return {
      when: new Date(s.created * 1000).toISOString(),
      name: c.name || '',
      email: (c.email || '').toLowerCase(),
      product,
      amount: '£' + ((s.amount_total || 0) / 100).toFixed(2),
      list: (s.metadata && s.metadata.add_to_list) || (hit ? hit[1] : 'Not sure - check the product'),
    };
  });
  return json({ configured: true, test: String(key).startsWith('rk_test_') || String(key).startsWith('sk_test_'), rows });
}
