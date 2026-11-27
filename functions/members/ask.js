// POST /members/ask -> the members' "Ask Mike" form.
// Cloudflare Access tells us who is signed in; their plan comes from Mike's Zero Trust lists
// (same rules as the support@ email worker). We email support@ with the plan and reply-by
// time at the front of the subject, e.g. "[Plus member] Reply by Mon 30 Nov, 8:34pm: Using AI tools from Jane".
// Needs: CF_ACCOUNT_ID, CF_API_TOKEN (already used by /members/me) and BREVO_API_KEY.
// Optional: ASK_TO (default support@easystartai.co.uk), ASK_FROM (default members@easystartai.co.uk,
// which must be a Brevo sender; if Brevo refuses it we fall back to the normal support@ sender).
import { lookupPlan, replyBy, tagFor } from '../_email/support-worker.js';
import { brevo, senders } from '../_email/brevo.js';

const TOPICS = ['Using an AI tool', 'A guide or template', 'My call or session', 'My plan or payment', 'Something else'];
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function emailFrom(request) {
  const h = request.headers.get('cf-access-authenticated-user-email');
  if (h) return h.trim().toLowerCase();
  const m = (request.headers.get('cookie') || '').match(/(?:^|;\s*)CF_Authorization=([^;]+)/);
  const jwt = request.headers.get('cf-access-jwt-assertion') || (m && m[1]) || '';
  try {
    const part = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return String(JSON.parse(atob(part + '='.repeat((4 - part.length % 4) % 4))).email || '').trim().toLowerCase();
  } catch (e) { return ''; }
}

const PROMISE = { plus: 'within 1 working day', starter: 'within 2 working days' };

// GET: what the form should say (reply time for this member's plan).
export async function onRequestGet({ request, env }) {
  const email = emailFrom(request);
  if (!email) return json({ ok: false, reason: 'not-signed-in' }, 401);
  let tier = 'unknown';
  try { tier = (await lookupPlan(env, email)).tier; } catch (e) {}
  return json({ ok: true, email, tier, promise: PROMISE[tier] || '', topics: TOPICS, sending: !!env.BREVO_API_KEY });
}

export async function onRequestPost({ request, env }) {
  const email = emailFrom(request);
  if (!email) return json({ ok: false, error: 'Please sign in again, then send your question.' }, 401);
  if (!env.BREVO_API_KEY) return json({ ok: false, error: 'Sorry, the form isn\'t switched on yet. Please email support@easystartai.co.uk instead.' }, 503);
  let d = {};
  try { d = await request.json(); } catch (e) {}
  const name = String(d.name || '').replace(/[\r\n<>]/g, ' ').trim().slice(0, 80);
  const topic = TOPICS.includes(d.topic) ? d.topic : 'Something else';
  const text = String(d.message || '').trim().slice(0, 5000);
  if (text.length < 5) return json({ ok: false, error: 'Please write a little more about what you need.' }, 400);

  let tier = 'unknown';
  try { tier = (await lookupPlan(env, email)).tier; } catch (e) {}
  if (tier === 'owner') tier = 'plus'; // Mike testing: show the Plus version
  const by = await replyBy(tier);
  const subject = tagFor(tier, by) + topic + ' from ' + (name || email);
  const html = '<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#17302b">'
    + '<p style="margin:0 0 12px"><strong>' + esc(tagFor(tier, by).replace(/: $/, '').trim() || 'Member') + '</strong></p>'
    + '<p style="margin:0 0 4px"><strong>From:</strong> ' + esc(name || '(no name given)') + ' &lt;' + esc(email) + '&gt;</p>'
    + '<p style="margin:0 0 16px"><strong>Topic:</strong> ' + esc(topic) + '</p>'
    + '<div style="white-space:pre-wrap;border-left:4px solid #0f8a74;padding:8px 14px;background:#f6f8f7">' + esc(text) + '</div>'
    + '<p style="margin:16px 0 0;font-size:13px;color:#566b66">Sent from the members library "Ask Mike" form. Press Reply to answer them (send it from support@).</p></div>';
  const plainText = subject + '\n\nFrom: ' + (name || '(no name given)') + ' <' + email + '>\nTopic: ' + topic + '\n\n' + text;
  const to = String(env.ASK_TO || 'support@easystartai.co.uk').trim();
  const b = brevo(env);
  const msg = { to, replyTo: { email, ...(name ? { name } : {}) }, subject, html, text: plainText, tags: ['ask-mike'] };
  try {
    await b.send({ ...msg, sender: { name: (name || email).slice(0, 60) + ' via Easy Start AI', email: String(env.ASK_FROM || 'members@easystartai.co.uk').trim() } });
  } catch (e) {
    try { await b.send({ ...msg, sender: senders(env).welcome }); }
    catch (e2) { return json({ ok: false, error: 'Sorry, that didn\'t send. Please email support@easystartai.co.uk instead.', detail: String(e2.message || e2) }, 502); }
  }
  return json({ ok: true, tier, replyBy: by, promise: PROMISE[tier] || '' });
}
