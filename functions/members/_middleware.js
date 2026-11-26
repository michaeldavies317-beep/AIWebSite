// The members pages are only locked (by Cloudflare Access) on our own domain.
// Anyone reaching them on a *.pages.dev address is sent to the locked address instead.
export async function onRequest(context) {
  const url = new URL(context.request.url);
  if (url.hostname.endsWith('.pages.dev')) {
    url.hostname = url.hostname === 'aiwebsite-akt.pages.dev' ? 'easystartai.co.uk' : 'dev.easystartai.co.uk';
    url.protocol = 'https:';
    url.port = '';
    return new Response(null, { status: 302, headers: { Location: url.toString(), 'Cache-Control': 'no-store' } });
  }
  return context.next();
}
