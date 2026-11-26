// The members pages are only locked (by Cloudflare Access) on our own domain.
// Anyone reaching them on a *.pages.dev address is sent to the locked address instead.
// The old admin address (/members/admin) now lives on its own locked address, so send people there.
export async function onRequest(context) {
  const url = new URL(context.request.url);
  const live = ['easystartai.co.uk', 'www.easystartai.co.uk', 'aiwebsite-akt.pages.dev'].includes(url.hostname);
  if (/^\/members\/admin(\/|$)/.test(url.pathname)) {
    const to = new URL('/admin/', 'https://' + (live ? 'admin.easystartai.co.uk' : 'admin-dev.easystartai.co.uk'));
    return new Response(null, { status: 302, headers: { Location: to.toString(), 'Cache-Control': 'no-store' } });
  }
  if (url.hostname.endsWith('.pages.dev')) {
    url.hostname = url.hostname === 'aiwebsite-akt.pages.dev' ? 'easystartai.co.uk' : 'dev.easystartai.co.uk';
    url.protocol = 'https:';
    url.port = '';
    return new Response(null, { status: 302, headers: { Location: url.toString(), 'Cache-Control': 'no-store' } });
  }
  return context.next();
}
