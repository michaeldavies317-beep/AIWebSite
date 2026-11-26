// Asks every visitor for a username and password before showing the site.
// The real username and password are NOT stored here. They live in Cloudflare
// as SITE_USER and SITE_PASSWORD (Pages > Settings > Variables and Secrets).

const REALM = 'Private preview';

function ask(message) {
  return new Response(message, {
    status: 401,
    headers: {
      'WWW-Authenticate': `Basic realm="${REALM}", charset="UTF-8"`,
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Robots-Tag': 'noindex, nofollow',
      'Cache-Control': 'no-store',
    },
  });
}

// Compares two strings without leaking how many characters matched.
function same(a, b) {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] || 0) ^ (y[i] || 0);
  return diff === 0;
}

export async function onRequest({ request, env, next }) {
  // Trim stray spaces, which easily sneak in when pasting into Cloudflare.
  const user = (env.SITE_USER || '').trim();
  const pass = (env.SITE_PASSWORD || '').trim();
  // If the password hasn't been set up yet, keep the site locked rather than open.
  if (!user && !pass) return ask('Locked: neither SITE_USER nor SITE_PASSWORD is set up in Cloudflare yet.');
  if (!user) return ask('Locked: SITE_USER is not set up in Cloudflare yet.');
  if (!pass) return ask('Locked: SITE_PASSWORD is not set up in Cloudflare yet.');

  const header = request.headers.get('Authorization') || '';
  if (header.startsWith('Basic ')) {
    let decoded = '';
    try { decoded = new TextDecoder().decode(Uint8Array.from(atob(header.slice(6)), c => c.charCodeAt(0))); } catch {}
    const i = decoded.indexOf(':');
    if (i > -1 && same(decoded.slice(0, i).trim().toLowerCase(), user.toLowerCase()) && same(decoded.slice(i + 1).trim(), pass)) {
      const res = await next();
      const out = new Response(res.body, res);
      out.headers.set('X-Robots-Tag', 'noindex, nofollow');
      return out;
    }
  }
  return ask(header ? 'That username or password did not match. Please try again.' : 'Please sign in to view this site.');
}
