// The front page. On the admin addresses, go straight to the admin tools.
// Everywhere else, show the normal home page (index.html) as usual.
export async function onRequest(context) {
  const host = new URL(context.request.url).hostname;
  if (host === 'admin-dev.easystartai.co.uk' || host === 'admin.easystartai.co.uk') {
    return new Response(null, { status: 302, headers: { Location: '/admin/', 'Cache-Control': 'no-store' } });
  }
  return context.next();
}
