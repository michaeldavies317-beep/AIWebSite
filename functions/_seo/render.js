// Gives each section of the one-page site its own real address (/business/, /parents/ ...),
// so search engines can list them separately. It serves the same index.html, with that
// section's title, description and canonical address filled in and that section shown.
// The titles and descriptions live in index.html (<script id="seoPages">), so there is one list to edit.
const SITE = 'https://easystartai.co.uk';

export async function renderSection(context, view) {
  const { request, env } = context;
  if (request.method !== 'GET' && request.method !== 'HEAD') return context.next();
  const url = new URL(request.url);
  if (!url.pathname.endsWith('/')) {
    url.pathname += '/';
    return Response.redirect(url.toString(), 301);
  }
  const res = await env.ASSETS.fetch(new URL('/', url));
  const html = await res.text();
  let page;
  try {
    const m = html.match(/<script type="application\/json" id="seoPages">([\s\S]*?)<\/script>/);
    page = JSON.parse(m[1])[view];
  } catch (e) { page = null; }
  if (!page) return context.next();
  const full = SITE + page.path;
  const headers = new Headers(res.headers);
  headers.delete('content-length');
  headers.delete('etag');
  headers.set('content-type', 'text/html; charset=utf-8');
  const set = (attr, value) => ({ element(e) { e.setAttribute(attr, value); } });
  return new HTMLRewriter()
    .on('title', { element(e) { e.setInnerContent(page.title); } })
    .on('meta[name="description"]', set('content', page.description))
    .on('meta[property="og:title"]', set('content', page.title))
    .on('meta[property="og:description"]', set('content', page.description))
    .on('meta[property="og:url"]', set('content', full))
    .on('link[rel="canonical"]', set('href', full))
    .on('[data-view]', { element(e) {
      if (e.getAttribute('data-view') === view) e.removeAttribute('hidden'); else e.setAttribute('hidden', '');
    } })
    .on('body', { element(e) {
      if (['business', 'personal', 'parents'].includes(view)) e.setAttribute('data-section', view);
    } })
    .transform(new Response(html, { status: 200, headers }));
}
