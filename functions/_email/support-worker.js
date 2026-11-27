// Easy Start AI: support email tagger (a Cloudflare Email Worker).
//
// What it does: when someone emails support@ (or hello@), it looks the sender up in Mike's
// Zero Trust email lists, then sends the email on to Mike's Gmail with the plan and the
// reply-by time at the front of the subject, for example:
//   [Plus member] Reply by Fri 28 Nov, 8:34pm: Help with my CV
//   [Starter member] Reply by Tue 2 Dec, 8:34pm: Chatbot question
//   [Guide buyer] Question about the family guide
//   [Not a member] Do you do websites?          (support@ only; hello@ leaves these alone)
// Replies still go straight to the sender (Reply-To), and the original email, attachments
// included, is kept as it was. If anything goes wrong, the email is forwarded untouched,
// so nothing is ever lost.
//
// Setup (Cloudflare dashboard, see the setup guide):
//   Variables:  CF_ACCOUNT_ID (text), CF_API_TOKEN (secret, "Zero Trust: Read"),
//               FORWARD_TO (text, Mike's Gmail; must be a verified Email Routing destination).
//   Optional:   FROM_ADDRESS (default members@easystartai.co.uk), TAG_NON_MEMBERS_ON
//               (default "support@easystartai.co.uk").
//   Binding:    Send email, variable name MAILER, destination = the FORWARD_TO address.
//   Email Routing: support@ (and hello@) -> "Send to a Worker" -> this worker.
//
// The Pages site imports the helpers below (lookupPlan, replyBy, tagFor) for the
// members' "Ask Mike" form, so both use exactly the same rules.

import { EmailMessage } from 'cloudflare:email';

const SITE_DOMAIN = 'easystartai.co.uk';

// ---------- Which plan is this person on? ----------
// List names are matched loosely (case and stray spaces don't matter).
const LIST_TIER = [
  [/mike|owner|admin/i, 'owner'],
  [/plus/i, 'plus'],
  [/starter/i, 'starter'],
  [/under.?10|10.?(to|-)?.?13|family.?set.?up|write.?like|\bcv\b|budget|hustle|notes|parent|bundle|guide/i, 'guide'],
];
const RANK = { owner: 4, plus: 3, starter: 2, guide: 1, none: 0 };

export async function lookupPlan(env, email) {
  email = String(email || '').trim().toLowerCase();
  if (!email) return { tier: 'none' };
  if (!env.CF_ACCOUNT_ID || !env.CF_API_TOKEN) return { tier: 'unknown', reason: 'missing-settings' };
  const api = (p) => fetch('https://api.cloudflare.com/client/v4/accounts/' + String(env.CF_ACCOUNT_ID).trim() + p,
    { headers: { Authorization: 'Bearer ' + String(env.CF_API_TOKEN).trim() } }).then((r) => r.json());
  const lists = await api('/gateway/lists?per_page=100');
  if (!lists.success) return { tier: 'unknown', reason: 'api-refused' };
  const wanted = (lists.result || []).filter((l) => /EMAIL/i.test(l.type || '') && LIST_TIER.some(([re]) => re.test(String(l.name || '').trim())));
  let tier = 'none';
  const found = [];
  await Promise.all(wanted.map(async (l) => {
    const items = await api('/gateway/lists/' + l.id + '/items?per_page=1000');
    const flat = (items.result || []).flat();
    if (flat.some((i) => String(i.value || '').trim().toLowerCase() === email)) {
      const name = String(l.name || '').trim();
      found.push(name);
      const t = LIST_TIER.find(([re]) => re.test(name))[1];
      if (RANK[t] > RANK[tier]) tier = t;
    }
  }));
  return { tier, lists: found };
}

// ---------- Reply-by time ----------
// Terms: Starter = within 2 working days, Plus = within 1 working day.
// Working days are Monday to Friday, not UK (England and Wales) bank holidays.
// The clock starts when the email arrives. If it arrives on a weekend or bank holiday,
// it counts as arriving at 9am on the next working day.
export const WORKING_DAYS = { plus: 1, starter: 2 };

const FALLBACK_HOLIDAYS = [
  '2026-01-01', '2026-04-03', '2026-04-06', '2026-05-04', '2026-05-25', '2026-08-31', '2026-12-25', '2026-12-28',
  '2027-01-01', '2027-03-26', '2027-03-29', '2027-05-03', '2027-05-31', '2027-08-30', '2027-12-27', '2027-12-28',
  '2028-01-03', '2028-04-14', '2028-04-17', '2028-05-01', '2028-05-29', '2028-08-28', '2028-12-25', '2028-12-26',
];

export async function bankHolidays() {
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 2500);
    const r = await fetch('https://www.gov.uk/bank-holidays.json', { signal: ctl.signal, cf: { cacheTtl: 86400, cacheEverything: true } });
    clearTimeout(t);
    const d = await r.json();
    const dates = (d['england-and-wales'].events || []).map((e) => e.date);
    if (dates.length) return new Set([...dates, ...FALLBACK_HOLIDAYS]);
  } catch (e) { /* use the built-in list */ }
  return new Set(FALLBACK_HOLIDAYS);
}

// UK clock time as a "wall clock" Date (its UTC fields hold the London time).
function londonWall(date) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(date).filter((x) => x.type !== 'literal').map((x) => [x.type, Number(x.value)]));
  return new Date(Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute));
}
const ymd = (w) => w.toISOString().slice(0, 10);
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function replyByFrom(received, workingDays, holidays) {
  const isWorking = (w) => w.getUTCDay() !== 0 && w.getUTCDay() !== 6 && !holidays.has(ymd(w));
  let w = londonWall(received);
  if (!isWorking(w)) {
    do { w = new Date(w.getTime() + 864e5); } while (!isWorking(w));
    w.setUTCHours(9, 0, 0, 0);
  }
  for (let i = 0; i < workingDays; i++) {
    do { w = new Date(w.getTime() + 864e5); } while (!isWorking(w));
  }
  const h = w.getUTCHours(), m = w.getUTCMinutes();
  const time = (h % 12 || 12) + (m ? ':' + String(m).padStart(2, '0') : '') + (h < 12 ? 'am' : 'pm');
  return DAYS[w.getUTCDay()] + ' ' + w.getUTCDate() + ' ' + MONTHS[w.getUTCMonth()] + ', ' + time;
}

export async function replyBy(tier, received = new Date()) {
  const n = WORKING_DAYS[tier];
  if (!n) return '';
  return replyByFrom(received, n, await bankHolidays());
}

// The words that go at the front of the subject. Gmail filters look for
// "Plus member Reply by" and "Starter member Reply by", so keep that wording.
export function tagFor(tier, by) {
  if (tier === 'plus') return '[Plus member] Reply by ' + by + ': ';
  if (tier === 'starter') return '[Starter member] Reply by ' + by + ': ';
  if (tier === 'guide') return '[Guide buyer] ';
  if (tier === 'none') return '[Not a member] ';
  if (tier === 'unknown') return '[Plan not checked] ';
  return '';
}

// ---------- Email handling ----------
const bytesToBin = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192)); return s; };
const binToBytes = (s) => { const u8 = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u8[i] = s.charCodeAt(i) & 0xff; return u8; };

// Split a raw email into header lines (kept exactly, folded lines joined) and the body bytes.
function splitMessage(u8) {
  let cut = -1, sepLen = 0;
  for (let i = 0; i < u8.length - 1; i++) {
    if (u8[i] === 10 && u8[i + 1] === 10) { cut = i; sepLen = 2; break; }
    if (u8[i] === 13 && u8[i + 1] === 10 && u8[i + 2] === 13 && u8[i + 3] === 10) { cut = i; sepLen = 4; break; }
  }
  if (cut < 0) return null;
  const head = bytesToBin(u8.subarray(0, cut));
  const headers = [];
  for (const line of head.split(/\r?\n/)) {
    if (/^[ \t]/.test(line) && headers.length) headers[headers.length - 1].raw += '\r\n' + line;
    else if (line) headers.push({ raw: line });
  }
  for (const h of headers) { const i = h.raw.indexOf(':'); h.name = h.raw.slice(0, i).trim().toLowerCase(); h.value = h.raw.slice(i + 1).replace(/\r\n[ \t]+/g, ' ').trim(); }
  return { headers, body: u8.subarray(cut + sepLen) };
}

const addrOf = (v) => { const m = String(v || '').match(/<([^<>\s]+@[^<>\s]+)>/) || String(v || '').match(/([^\s<>",;:]+@[^\s<>",;:]+)/); return m ? m[1].trim().toLowerCase() : ''; };
const nameOf = (v) => { const s = String(v || ''); const i = s.indexOf('<'); return (i > 0 ? s.slice(0, i) : '').trim().replace(/^"|"$/g, '').trim(); };

// "Jane Smith via Easy Start AI" <members@...>. Keeps an encoded (non-English) name as it was.
function displayFrom(fromValue, email, fromAddress) {
  let name = nameOf(fromValue);
  let phrase;
  if (/=\?[^?]+\?[bq]\?[^?]*\?=/i.test(name)) phrase = name + ' via Easy Start AI';
  else {
    name = (name || email).replace(/[^\x20-\x7e]/g, '').replace(/["\\]/g, '').trim() || email;
    phrase = '"' + name + ' via Easy Start AI"';
  }
  return phrase + ' <' + fromAddress + '>';
}

// Headers we drop: signatures and delivery stamps that would no longer match, plus the ones we rewrite.
const DROP = /^(dkim-signature|x-google-dkim-signature|arc-.*|authentication-results|received-spf|return-path|received|delivered-to|from|sender|subject|reply-to|message-id|x-easy-start-ai-.*)$/;

export function retag(u8, { tag, fromAddress, senderEmail }) {
  const msg = splitMessage(u8);
  if (!msg) throw new Error('could not read the email headers');
  const get = (n) => (msg.headers.find((h) => h.name === n) || {}).value || '';
  const subjectHeader = msg.headers.find((h) => h.name === 'subject');
  // Keep the original subject text exactly (it may be encoded), just put the tag in front.
  const subjectRaw = subjectHeader ? subjectHeader.raw.slice(subjectHeader.raw.indexOf(':') + 1).replace(/^[ \t]+/, '') : '(no subject)';
  const replyTo = get('reply-to') || get('from');
  const id = crypto.randomUUID() + '@' + SITE_DOMAIN;
  const out = [
    'From: ' + displayFrom(get('from'), senderEmail, fromAddress),
    'Reply-To: ' + replyTo,
    'Subject: ' + tag + subjectRaw,
    'Message-ID: <' + id + '>',
    'X-Easy-Start-AI-Original-From: ' + senderEmail,
  ];
  for (const h of msg.headers) if (!DROP.test(h.name)) out.push(h.raw);
  if (!msg.headers.some((h) => h.name === 'date')) out.push('Date: ' + new Date().toUTCString().replace('GMT', '+0000'));
  const head = binToBytes(out.join('\r\n') + '\r\n\r\n');
  const all = new Uint8Array(head.length + msg.body.length);
  all.set(head, 0); all.set(msg.body, head.length);
  return all;
}

async function readAll(stream, max = 25 * 1024 * 1024) {
  const reader = stream.getReader();
  const parts = []; let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value); size += value.length;
    if (size > max) throw new Error('email too big to retag');
  }
  const u8 = new Uint8Array(size); let o = 0;
  for (const p of parts) { u8.set(p, o); o += p.length; }
  return u8;
}

export default {
  async email(message, env, ctx) {
    const forwardTo = String(env.FORWARD_TO || '').trim();
    const fromAddress = String(env.FROM_ADDRESS || 'members@' + SITE_DOMAIN).trim();
    const tagNonMembersOn = String(env.TAG_NON_MEMBERS_ON || 'support@' + SITE_DOMAIN).toLowerCase().split(/[\s,]+/).filter(Boolean);
    const plain = (why) => message.forward(forwardTo, new Headers({ 'X-Easy-Start-AI-Note': why }));
    if (!forwardTo) { message.setReject('Mailbox not set up yet, please try again later.'); return; }

    const fromHeader = message.headers.get('from') || '';
    let sender = addrOf(fromHeader) || String(message.from || '').toLowerCase();
    // Website form emails (Web3Forms) come from their address; the visitor is in Reply-To.
    if (/@web3forms\.com$/i.test(sender) && addrOf(message.headers.get('reply-to'))) sender = addrOf(message.headers.get('reply-to'));

    // Our own emails (Mike, the "Ask Mike" form, Brevo tests) are already tagged: pass them on as they are.
    if (sender.endsWith('@' + SITE_DOMAIN)) return plain('own domain');

    let tier;
    try { tier = (await lookupPlan(env, sender)).tier; } catch (e) { tier = 'unknown'; }
    if (tier === 'owner') return plain('owner');
    const to = String(message.to || '').toLowerCase();
    if ((tier === 'none' || tier === 'unknown') && !tagNonMembersOn.includes(to)) return plain('not a member');

    try {
      const by = await replyBy(tier);
      const raw = await readAll(message.raw);
      const tagged = retag(raw, { tag: tagFor(tier, by), fromAddress, senderEmail: sender });
      await env.MAILER.send(new EmailMessage(fromAddress, forwardTo, tagged));
    } catch (e) {
      // Never lose an email: if retagging fails, forward the original untouched.
      console.log('retag failed, forwarding as it is: ' + (e && e.message || e));
      await plain('retag failed');
    }
  },
};
