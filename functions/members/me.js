// GET /members/me -> which plans the signed-in member has.
// Cloudflare Access (on dev.easystartai.co.uk / easystartai.co.uk) tells us who they are.
// We then look them up in Mike's Zero Trust email lists (read-only API token).
// Needs two settings in Cloudflare Pages: CF_ACCOUNT_ID (plain text) and CF_API_TOKEN (secret, "Zero Trust: Read").
const PLAN_FOR = [
  [/mike|owner|admin/i, 'all'],
  [/plus/i, 'plus'],
  [/starter/i, 'starter'],
  [/parent/i, 'parents'],
];
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export async function onRequestGet({ request, env }) {
  const email = (request.headers.get('cf-access-authenticated-user-email') || '').trim().toLowerCase();
  if (!email) return json({ signedIn: false, configured: false, plans: [] });
  if (!env.CF_ACCOUNT_ID || !env.CF_API_TOKEN) return json({ signedIn: true, email, configured: false, plans: [] });
  const api = (p) => fetch('https://api.cloudflare.com/client/v4/accounts/' + env.CF_ACCOUNT_ID.trim() + p, { headers: { Authorization: 'Bearer ' + env.CF_API_TOKEN.trim() } }).then(r => r.json());
  try {
    const lists = await api('/gateway/lists?per_page=100');
    if (!lists.success) return json({ signedIn: true, email, configured: false, error: 'lists', plans: [] });
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
    return json({ signedIn: true, email, configured: true, plans: [...plans] });
  } catch (e) {
    return json({ signedIn: true, email, configured: false, error: 'api', plans: [] });
  }
}
