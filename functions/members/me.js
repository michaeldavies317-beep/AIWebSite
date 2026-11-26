// GET /members/me -> which plans the signed-in member has.
// Cloudflare Access (on dev.easystartai.co.uk / easystartai.co.uk) tells us who they are.
// We then look them up in Mike's Zero Trust email lists (read-only API token).
// Needs two settings in Cloudflare Pages: CF_ACCOUNT_ID (plain text) and CF_API_TOKEN (secret, "Zero Trust: Read").
const PLAN_FOR = [
  [/mike|owner|admin/i, 'all'],
  [/plus/i, 'plus'],
  [/starter/i, 'starter'],
  // One parent guide bought on its own (checked before the bundle list below).
  [/under.?10/i, 'guide_under10'],
  [/10.?(to|-)?.?13/i, 'guide_10to13'],
  [/family.?set.?up/i, 'guide_family'],
  // One Plus guide bought on its own.
  [/write.?like/i, 'guide_write'],
  [/\bcv\b/i, 'guide_cv'],
  [/budget/i, 'guide_budget'],
  [/hustle/i, 'guide_hustle'],
  [/notes/i, 'guide_notes'],
  // Bundle buyers (all three guides + printables). "Parent Guide Buyers" still counts as the bundle.
  [/parent|bundle/i, 'parents'],
];
const GUIDES = ['guide_under10', 'guide_10to13', 'guide_family'];
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

// Who is signed in? Access normally adds a header; if not, read the email from the Access token (already checked by Access).
function emailFrom(request) {
  const h = request.headers.get('cf-access-authenticated-user-email');
  if (h) return h.trim().toLowerCase();
  const cookie = request.headers.get('cookie') || '';
  const m = cookie.match(/(?:^|;\s*)CF_Authorization=([^;]+)/);
  const jwt = request.headers.get('cf-access-jwt-assertion') || (m && m[1]) || '';
  try {
    const part = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(part + '='.repeat((4 - part.length % 4) % 4)));
    return String(payload.email || '').trim().toLowerCase();
  } catch (e) { return ''; }
}

export async function onRequestGet({ request, env }) {
  const email = emailFrom(request);
  if (!email) return json({ signedIn: false, configured: false, reason: 'no-identity', plans: [] });
  if (!env.CF_ACCOUNT_ID || !env.CF_API_TOKEN) return json({ signedIn: true, email, configured: false, reason: 'missing-settings', hasAccountId: !!env.CF_ACCOUNT_ID, hasToken: !!env.CF_API_TOKEN, plans: [] });
  const api = (p) => fetch('https://api.cloudflare.com/client/v4/accounts/' + env.CF_ACCOUNT_ID.trim() + p, { headers: { Authorization: 'Bearer ' + env.CF_API_TOKEN.trim() } }).then(r => r.json());
  try {
    const lists = await api('/gateway/lists?per_page=100');
    if (!lists.success) return json({ signedIn: true, email, configured: false, reason: 'api-refused', apiErrors: (lists.errors || []).map(e => e.code + ' ' + e.message), plans: [] });
    const plans = new Set();
    const wanted = (lists.result || []).filter(l => /EMAIL/i.test(l.type || '') && PLAN_FOR.some(([re]) => re.test(l.name)));
    await Promise.all(wanted.map(async l => {
      const items = await api('/gateway/lists/' + l.id + '/items?per_page=1000');
      const flat = (items.result || []).flat();
      if (flat.some(i => String(i.value || '').trim().toLowerCase() === email)) {
        const plan = PLAN_FOR.find(([re]) => re.test(l.name))[1];
        if (plan === 'all') ['starter', 'plus', 'parents', 'owner'].forEach(p => plans.add(p)); else plans.add(plan);
      }
    }));
    if (plans.has('plus')) { plans.add('starter'); plans.add('parents'); }
    if (plans.has('parents')) GUIDES.forEach(g => plans.add(g));
    return json({ signedIn: true, email, configured: true, listsFound: wanted.map(l => l.name), plans: [...plans] });
  } catch (e) {
    return json({ signedIn: true, email, configured: false, reason: 'api-error', detail: String(e && e.message || e), plans: [] });
  }
}
