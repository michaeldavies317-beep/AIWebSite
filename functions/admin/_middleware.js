// The admin pages (/admin/...) only open on their own address, which Cloudflare Access
// locks as a whole to Mike:
//   admin-dev.easystartai.co.uk -> the dev site (what we test on)
//   admin.easystartai.co.uk     -> the live site (set up at launch)
// On any other address (dev.easystartai.co.uk, easystartai.co.uk, *.pages.dev) the visitor
// is sent to the matching admin address, so the admin is never reachable without the lock.
const ADMIN_HOSTS = ['admin-dev.easystartai.co.uk', 'admin.easystartai.co.uk'];
const LIVE_HOSTS = ['easystartai.co.uk', 'www.easystartai.co.uk', 'aiwebsite-akt.pages.dev'];

export async function onRequest(context) {
  const url = new URL(context.request.url);
  if (!ADMIN_HOSTS.includes(url.hostname)) {
    url.hostname = LIVE_HOSTS.includes(url.hostname) ? 'admin.easystartai.co.uk' : 'admin-dev.easystartai.co.uk';
    url.protocol = 'https:';
    url.port = '';
    return new Response(null, { status: 302, headers: { Location: url.toString(), 'Cache-Control': 'no-store' } });
  }
  const res = await context.next();
  const out = new Response(res.body, res);
  out.headers.set('X-Robots-Tag', 'noindex, nofollow');
  out.headers.set('Cache-Control', 'no-store');
  return out;
}
