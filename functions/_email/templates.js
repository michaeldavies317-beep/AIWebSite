// Branded emails for Easy Start AI. Not a web page: the files in functions/_email are only
// imported by other functions (the webhook and the admin email tools).
//
// Colours are the site's own (index.html):
//   Personal (Starter, Plus, £9 guides): teal #0f8a74, plainer layout
//   Parents (parent guides and bundle): amber #a8620a with the sun yellow #ffd166, brighter layout
//   Business (newsletter template only): blue #2f63b0, a little more formal, no Pip
// Images live in /email/ on the site (email apps can't show SVG). On dev that folder needs an
// Access Bypass app, or the images show as blank boxes (setup guide Part 11).

export const PORTAL_LINK = 'https://billing.stripe.com/p/login/test_3cI5kDbRhdL1e0T7f85AQ00'; // LAUNCH: swap for the live link
export const SUPPORT = 'support@easystartai.co.uk';

export const THEMES = {
  personal: { name: 'Personal', accent: '#0f8a74', soft: '#dff2ec', bg: '#f6f8f7', band: '#ffffff', logo: 'logo-teal.png', pip: 'pip-teal.png', bright: false },
  parents: { name: 'Parents', accent: '#a8620a', soft: '#fff0d4', bg: '#fff3d1', band: '#ffd166', logo: 'logo-amber.png', pip: 'pip-amber.png', bright: true },
  business: { name: 'Business', accent: '#2f63b0', soft: '#e3ecf9', bg: '#f3f6fb', band: '#ffffff', logo: 'logo-blue.png', pip: null, bright: false },
};

const INK = '#17302b', MUTED = '#566b66', LINE = '#dde6e3', SUN = '#ffd166';
const BODY_FONT = "Figtree,'Segoe UI',Helvetica,Arial,sans-serif";
const HEAD_FONT = "'Bricolage Grotesque','Trebuchet MS',Helvetica,Arial,sans-serif";

export const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// What each purchase means. key -> details. "list" is the Brevo mailing list for new-content emails.
const P = (key, o) => ({ key, ...o });
const STARTER_ITEMS = [
  ['Start here: your first week with AI', '/members/starter/first-week.html', 'Five days, ten minutes a day, one small win each day.'],
  ['The prompt recipe card', '/members/starter/prompt-recipe.html', 'Who, What, How: the one-page recipe for better answers.'],
  ['Life admin letters', '/members/starter/life-admin-letters.html', 'Refunds, complaints, council, landlord and cancellations.'],
  ['Spot an AI scam', '/members/starter/spot-a-scam.html', 'The tell-tale signs, in plain English.'],
];
const PLUS_ITEMS = [
  ['Before your set-up call', '/members/plus/before-your-call/', 'Five minutes of prep so your 30-minute call flies.'],
  ['Your first AI assistant for work', '/members/plus/work-assistant.html', 'Set up a helper that knows your work, in one sitting.'],
  ['Teach AI to write like you', '/members/plus/write-like-you/', 'Emails and posts that sound like you, not a robot.'],
  ["What's new in AI this month", '/members/plus/whats-new/2026-12.html', 'The changes that matter, minus the hype.'],
];
const PARENT_BUNDLE_ITEMS = [
  ['First steps with AI (under 10s)', '/members/parents/under-10/', 'Gentle, playful first steps you can do together.'],
  ['AI, homework and chatbots (10 to 13s)', '/members/parents/10-to-13/', 'Where AI helps with homework, and where it crosses the line.'],
  ['Family set-up guide', '/members/parents/family-setup/', 'Step-by-step settings for every device in the house.'],
  ['Printables: rules poster, conversation cards and the "Is this app OK?" checklist', '/members/parents/bundle/family-rules.html', 'Stick them on the fridge.'],
];

export const PRODUCTS = {
  starter: P('starter', { theme: 'personal', list: 'Starter members', subscription: true, title: 'Starter', subject: 'Welcome to Easy Start AI Starter',
    headline: 'Welcome to Starter!', intro: "You're in. AI isn't scary, it's simple once you know what you want, and your members library is full of small, useful wins to get you there.",
    perks: ['Members’ tips, templates and short courses, with new ones added regularly', 'Message us any time at ' + SUPPORT + ', and we reply within 2 working days'],
    items: STARTER_ITEMS, start: ['Start your first week with AI', '/members/starter/first-week.html'],
    pip: 'Tip: try one template today, even if it only saves you five minutes. Small wins add up.' }),
  plus: P('plus', { theme: 'personal', list: 'Plus members', subscription: true, title: 'Plus', subject: 'Welcome to Easy Start AI Plus',
    headline: 'Welcome to Plus!', intro: "You're in. AI isn't scary, it's simple once you know what you want, and Plus gives you everything we make, plus a real person to help.",
    perks: ['Everything in the members library, including all the guides and the parent guides', 'A 30-minute set-up call to get you started', 'Message us any time at ' + SUPPORT + ', and we reply within 1 working day'],
    items: PLUS_ITEMS, start: ['Get ready for your set-up call', '/members/plus/before-your-call/'],
    callout: '<strong>Book your set-up call:</strong> just reply to this email with two or three days and times that suit you, and Mike will confirm one.',
    pip: 'Tip: jot down the one job you’d most like AI to take off your plate. That’s the perfect place to start your call.' }),
  bundle: P('bundle', { theme: 'parents', list: 'Parent guide buyers', title: 'Parent guide bundle', subject: 'Your parent guide bundle is ready',
    headline: 'Your parent guides are ready!', intro: "Thanks for buying the bundle. AI isn't scary, for you or your kids. These guides make it simple, with no lectures and no scaremongering.",
    perks: ['All three parent guides: under 10s, 10 to 13s and the family set-up guide', 'Three printables: the family rules poster, conversation cards and the "Is this app OK?" checklist', 'Yours to keep, including any updates we make'],
    items: PARENT_BUNDLE_ITEMS, start: ['Start with the Family set-up guide', '/members/parents/family-setup/'],
    pip: 'Tip: start with the family set-up guide. Its 15-minute plan is the quickest win.' }),
  under10: P('under10', { theme: 'parents', list: 'Parent guide buyers', title: 'First steps with AI (under 10s)', subject: 'Your guide is ready: First steps with AI (under 10s)',
    headline: 'Your guide is ready!', intro: "Thanks for buying <strong>First steps with AI (under 10s)</strong>. AI isn't scary, for you or your little ones, and this guide keeps it gentle and fun.",
    perks: ['What AI is, in words young children get, plus fun things to make together', 'Safe settings for smart speakers and tablets, and which apps to wait on', 'Yours to keep, including any updates we make'],
    start: ['Open First steps with AI (under 10s)', '/members/parents/under-10/'],
    pip: 'Tip: pick one of the fun things to make together this week. Ten minutes, side by side, is plenty.' }),
  '10to13': P('10to13', { theme: 'parents', list: 'Parent guide buyers', title: 'AI, homework and chatbots (10 to 13s)', subject: 'Your guide is ready: AI, homework and chatbots (10 to 13s)',
    headline: 'Your guide is ready!', intro: "Thanks for buying <strong>AI, homework and chatbots (10 to 13s)</strong>. AI isn't scary, and this guide helps you and your child use it well, without the arguments.",
    perks: ['Helping versus cheating: a simple line, and what schools usually allow', 'Age limits, privacy settings and chatbot “friends”, explained kindly', 'Yours to keep, including any updates we make'],
    start: ['Open AI, homework and chatbots', '/members/parents/10-to-13/'],
    pip: 'A good first question for your child: “What’s the most useful thing you’ve asked a chatbot?”' }),
  family: P('family', { theme: 'parents', list: 'Parent guide buyers', title: 'Family set-up guide', subject: 'Your guide is ready: Family set-up guide',
    headline: 'Your guide is ready!', intro: "Thanks for buying the <strong>Family set-up guide</strong>. AI isn't scary, it's simple once it's set up right, and this guide walks you through it step by step.",
    perks: ['A 15-minute plan, then step-by-step settings for iPhone, Android, Windows, Xbox, PlayStation and Switch', 'AI apps and browsers covered, plus a quick check-up every school term', 'Yours to keep, including any updates we make'],
    start: ['Open the Family set-up guide', '/members/parents/family-setup/'],
    pip: 'Tip: start with the 15-minute plan, with a cup of tea. That’s all it takes to get going.' }),
};
const single = (key, title, url, blurb) => P(key, { theme: 'personal', list: 'Single guide buyers', title, subject: 'Your guide is ready: ' + title,
  headline: 'Your guide is ready!', intro: "Thanks for buying <strong>" + esc(title) + "</strong>. AI isn't scary, it's simple once you know what you want, and this guide shows you how, step by step.",
  perks: [blurb, 'Yours to keep, including any updates we make'], start: ['Open ' + title, url],
  pip: 'Tip: pick one thing from the guide and try it today. Five minutes is enough to see the difference.',
  upsell: 'Want all five guides and a real person to help? <a href="{{site}}/#plan-plus" style="color:{{accent}}">Plus</a> includes every guide.' });
Object.assign(PRODUCTS, {
  write: single('write', 'Teach AI to write like you', '/members/plus/write-like-you/', 'Get emails and posts that sound like you, not a robot'),
  cv: single('cv', 'CV and job application kit', '/members/plus/cv-kit/', 'Polish your CV, cover letters and interview answers with AI'),
  budget: single('budget', 'Money and budgeting with AI', '/members/plus/budgeting/', 'Make sense of your money and build a budget that sticks'),
  hustle: single('hustle', 'Start a side hustle with AI', '/members/plus/side-hustle/', 'Test an idea and get your first customers, with AI doing the legwork'),
  notes: single('notes', 'Notes to actions', '/members/plus/notes-to-actions/', 'Turn messy notes and meetings into clear to-do lists'),
});

// Stripe tag or product name -> product key (same order as the webhook's list matching).
const KEYS = [
  [/bundle|parent guide buyers/i, 'bundle'], [/under.?10/i, 'under10'], [/10.?(to|-)?.?13/i, '10to13'], [/family.?set.?up/i, 'family'],
  [/write.?like/i, 'write'], [/\bcv\b/i, 'cv'], [/budget/i, 'budget'], [/hustle/i, 'hustle'], [/notes/i, 'notes'],
  [/plus/i, 'plus'], [/starter/i, 'starter'],
];
export const productKeyFor = (text) => { if (/no list/i.test(text || '')) return null; const h = KEYS.find(([re]) => re.test(text || '')); return h ? h[1] : null; };

// ---------- shared layout ----------
function button(href, label, t) {
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:8px 0 4px"><tr><td style="border-radius:999px;background:${t.accent}"><a href="${esc(href)}" style="display:inline-block;padding:14px 26px;font-family:${BODY_FONT};font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px">${esc(label)}</a></td></tr></table>`;
}

function header(t, site) {
  const word = `<span style="font-family:${HEAD_FONT};font-size:22px;font-weight:800;color:${INK};letter-spacing:-0.2px">Easy Start <span style="color:${t.accent}">AI</span></span>`;
  let logo = `<img src="${site}/email/${t.logo}" width="40" height="40" alt="" style="display:block;border:0;width:40px;height:40px">`;
  // On the sunny parents band the yellow sun needs a white tile behind it to show.
  if (t.bright) logo = `<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td style="background:#ffffff;border-radius:14px;padding:6px">${logo}</td></tr></table>`;
  const inner = `<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td style="padding-right:10px;vertical-align:middle">${logo}</td><td style="vertical-align:middle">${word}</td></tr></table>`;
  if (t.bright) {
    // Parents: sunny yellow band with little coloured dots, like the bright kids' pages.
    const dots = ['#ffffff', '#a8620a', '#0f8a74', '#ffffff'].map((c) => `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${c};margin-left:6px"></span>`).join('');
    return `<tr><td style="background:${SUN};padding:20px 28px;border-radius:20px 20px 0 0"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td>${inner}</td><td align="right" style="vertical-align:middle">${dots}</td></tr></table></td></tr>`;
  }
  const rule = t === THEMES.business ? `border-top:6px solid ${t.accent};` : `border-top:4px solid ${t.accent};`;
  return `<tr><td style="background:#ffffff;${rule}padding:22px 28px 10px;border-radius:${t === THEMES.business ? '6px 6px' : '18px 18px'} 0 0">${inner}</td></tr>`;
}

function pipRow(t, site, text) {
  if (!t.pip || !text) return '';
  const size = t.bright ? 64 : 48;
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:22px 0 6px"><tr>
<td width="${size + 12}" style="vertical-align:top;padding-right:12px"><img src="${site}/email/${t.pip}" width="${size}" height="${size}" alt="Pip" style="display:block;border:0;width:${size}px;height:${size}px"></td>
<td style="vertical-align:middle;background:${t.soft};border-radius:16px 16px 16px 4px;padding:12px 16px;font-family:${BODY_FONT};font-size:15px;line-height:1.5;color:${INK}">${text}</td></tr></table>`;
}

export function shell(t, { site, preheader, body, footerExtra = '' }) {
  const radius = t === THEMES.business ? '6px' : t.bright ? '20px' : '18px';
  const border = t.bright ? `border:3px solid ${SUN}` : `border:1px solid ${LINE}`;
  return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light">
<title>Easy Start AI</title>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Figtree:wght@400;600;700&display=swap" rel="stylesheet">
<style>a{color:${t.accent}} @media (max-width:620px){.card{border-radius:0!important}.pad{padding-left:20px!important;padding-right:20px!important}}</style></head>
<body style="margin:0;padding:0;background:${t.bg}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader || '')}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${t.bg}"><tr><td align="center" style="padding:24px 8px">
<table role="presentation" class="card" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:${radius};${border};border-collapse:separate">
${header(t, site)}
<tr><td class="pad" style="padding:14px 28px 28px;font-family:${BODY_FONT};font-size:16px;line-height:1.6;color:${INK}">${body}</td></tr>
</table>
<table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px"><tr><td style="padding:16px 28px;font-family:${BODY_FONT};font-size:13px;line-height:1.5;color:${MUTED};text-align:center">
Easy Start AI &middot; Wistaston, Cheshire &middot; <a href="mailto:${SUPPORT}" style="color:${MUTED}">${SUPPORT}</a><br>
<a href="${site}/privacy/" style="color:${MUTED}">Privacy</a> &middot; <a href="${site}/terms/" style="color:${MUTED}">Terms</a>${footerExtra}
</td></tr></table>
</td></tr></table></body></html>`;
}

const h1 = (t, s) => `<h1 style="margin:14px 0 10px;font-family:${HEAD_FONT};font-size:${t.bright ? 30 : 26}px;line-height:1.15;font-weight:800;color:${t.bright ? t.accent : INK}">${s}</h1>`;
const h2 = (t, s) => `<h2 style="margin:24px 0 8px;font-family:${HEAD_FONT};font-size:19px;line-height:1.2;font-weight:700;color:${INK}">${s}</h2>`;

function ticks(t, rows) {
  const mark = t.bright ? ['#a8620a', '#0f8a74', '#e0457b', '#3b6fb6'] : [t.accent];
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">${rows.map((r, i) => `<tr><td width="28" style="vertical-align:top;padding:3px 0"><span style="display:inline-block;width:20px;height:20px;line-height:20px;border-radius:50%;background:${mark[i % mark.length]};color:#ffffff;font-size:12px;font-weight:700;text-align:center;font-family:${BODY_FONT}">&#10003;</span></td><td style="padding:2px 0 8px;font-family:${BODY_FONT};font-size:16px;line-height:1.5;color:${INK}">${r}</td></tr>`).join('')}</table>`;
}

function itemList(t, site, items) {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">${items.map(([title, url, blurb]) => `<tr><td style="padding:10px 14px;border:1px solid ${t.bright ? '#ffe2a3' : LINE};border-radius:12px;background:${t.bright ? '#fffaf0' : '#ffffff'}"><a href="${esc(site + url)}" style="font-family:${BODY_FONT};font-weight:700;font-size:16px;color:${t.accent};text-decoration:none">${esc(title)}</a><br><span style="font-family:${BODY_FONT};font-size:14px;color:${MUTED}">${esc(blurb)}</span></td></tr><tr><td height="8" style="font-size:0;line-height:0">&nbsp;</td></tr>`).join('')}</table>`;
}

// ---------- welcome email ----------
export function welcomeEmail(key, { site, name, email }) {
  const p = PRODUCTS[key];
  if (!p) throw new Error('No welcome email for "' + key + '"');
  const t = THEMES[p.theme];
  const first = String(name || '').trim().split(/\s+/)[0];
  const hi = first ? 'Hi ' + esc(first) + ',' : 'Hi there,';
  const library = site + '/members/';
  const fill = (s) => String(s || '').replace(/\{\{site\}\}/g, site).replace(/\{\{accent\}\}/g, t.accent);

  const login = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:6px 0"><tr><td style="background:${t.soft};border-radius:14px;padding:16px 18px;font-family:${BODY_FONT};font-size:15px;line-height:1.6;color:${INK}">
<strong style="font-family:${HEAD_FONT};font-size:17px">How to log in (no password needed)</strong>
<ol style="margin:8px 0 0;padding-left:20px">
<li>Go to <a href="${esc(library)}" style="color:${t.accent};font-weight:700">your members library</a>.</li>
<li>Enter the email you paid with${email ? ': <strong>' + esc(email) + '</strong>' : ''}.</li>
<li>We email you a 6-digit code. Type it in and you're in. (No code after a couple of minutes? Check your junk folder.)</li>
</ol>
<span style="color:${MUTED};font-size:14px">You'll stay logged in on that device, so you won't need a code every time.</span></td></tr></table>`;

  const parts = [
    h1(t, p.headline),
    `<p style="margin:0 0 12px">${hi}</p>`,
    `<p style="margin:0 0 16px">${p.intro}</p>`,
    button(site + p.start[1], p.start[0], t),
    h2(t, p.subscription ? 'What your plan includes' : 'What you get'),
    ticks(t, p.perks.map((x) => esc(x).replace(esc(SUPPORT), `<a href="mailto:${SUPPORT}" style="color:${t.accent}">${SUPPORT}</a>`))),
    p.callout ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:10px 0"><tr><td style="border-left:4px solid ${t.accent};padding:10px 14px;font-size:15px;background:#ffffff">${p.callout}</td></tr></table>` : '',
    p.items ? h2(t, 'Good places to start') + itemList(t, site, p.items) : '',
    h2(t, 'Logging in'),
    login,
    pipRow(t, site, esc(p.pip)),
    p.subscription ? `<p style="margin:18px 0 6px;font-size:15px;color:${MUTED}">Your plan renews monthly, and we'll remind you 7 days before each renewal. You can update your card or cancel any time: <a href="${PORTAL_LINK}" style="color:${t.accent}">Manage or cancel your plan</a> (enter the email you paid with).</p>` : '',
    p.upsell ? `<p style="margin:18px 0 6px;font-size:15px;color:${MUTED}">${fill(p.upsell)}</p>` : '',
    `<p style="margin:18px 0 0">Any questions at all, just reply to this email or write to <a href="mailto:${SUPPORT}" style="color:${t.accent}">${SUPPORT}</a>. A real person reads every message.</p>`,
    `<p style="margin:16px 0 0">Mike<br><span style="color:${MUTED};font-size:14px">Easy Start AI</span></p>`,
  ];
  const html = shell(t, { site, preheader: p.subscription ? 'Your plan, how to log in, and where to start.' : 'Your guide is in your members library. Here’s how to open it.', body: parts.join('\n') });

  const text = [
    p.headline.replace(/<[^>]+>/g, ''), '', first ? 'Hi ' + first + ',' : 'Hi there,', '', p.intro.replace(/<[^>]+>/g, ''), '',
    p.start[0] + ': ' + site + p.start[1], '',
    (p.subscription ? 'What your plan includes:' : 'What you get:'), ...p.perks.map((x) => '- ' + x), '',
    ...(p.callout ? [p.callout.replace(/<[^>]+>/g, ''), ''] : []),
    ...(p.items ? ['Good places to start:', ...p.items.map(([a, u]) => '- ' + a + ': ' + site + u), ''] : []),
    'How to log in (no password needed):', '1. Go to ' + library, '2. Enter the email you paid with' + (email ? ': ' + email : '') + '.', '3. We email you a 6-digit code. Type it in. (Check junk if it does not arrive.)', '',
    'Pip says: ' + p.pip, '',
    ...(p.subscription ? ['Manage or cancel your plan: ' + PORTAL_LINK, ''] : []),
    'Questions? Reply to this email or write to ' + SUPPORT + '.', '', 'Mike', 'Easy Start AI',
  ].join('\n');
  return { subject: p.subject, html, text, theme: p.theme, list: p.list };
}

// ---------- "New this month" announcement (sent from Brevo as a campaign) ----------
// items: [{title, url, blurb}] ; Brevo fills {{ contact.FIRSTNAME }} and {{ unsubscribe }}.
export function newsEmail(themeKey, { site, heading, intro, items, pip }) {
  const t = THEMES[themeKey] || THEMES.personal;
  const greet = `<p style="margin:0 0 12px">Hi {{ contact.FIRSTNAME | default : "there" }},</p>`;
  const list = (items || []).filter((i) => i && i.title).map((i) => [i.title, i.url || '/members/', i.blurb || '']);
  const body = [
    `<p style="margin:10px 0 0;font-family:${BODY_FONT};font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${t.accent}">New this month</p>`,
    h1(t, esc(heading || 'New in your members library')),
    greet,
    `<p style="margin:0 0 16px">${esc(intro || '').replace(/\n/g, '<br>')}</p>`,
    list.length ? itemList(t, site, list) : '',
    button(site + '/members/', themeKey === 'business' ? 'View the new resources' : 'Open your library', t),
    pipRow(t, site, pip ? esc(pip) : ''),
    `<p style="margin:18px 0 0">${themeKey === 'business' ? 'If you would like to talk any of this through, reply to this email and we will arrange a time.' : 'Questions? Just reply to this email. A real person reads every message.'}</p>`,
    `<p style="margin:16px 0 0">${themeKey === 'business' ? 'Kind regards,<br>' : ''}Mike<br><span style="color:${MUTED};font-size:14px">Easy Start AI</span></p>`,
  ].join('\n');
  const why = themeKey === 'parents' ? 'you bought a parent guide' : themeKey === 'business' ? 'you asked to hear from us about AI for your business' : 'you are an Easy Start AI member or bought one of our guides';
  return shell(t, { site, preheader: intro ? String(intro).slice(0, 110) : 'New in your members library.', body,
    footerExtra: `<br>You're getting this because ${why}. <a href="{{ unsubscribe }}" style="color:${MUTED}">Unsubscribe</a>` });
}

// Audiences Mike can send a "New this month" email to: Brevo list names + theme.
export const AUDIENCES = {
  personal: { label: 'Starter and Plus members', lists: ['Starter members', 'Plus members'], theme: 'personal' },
  plus: { label: 'Plus members only', lists: ['Plus members'], theme: 'personal' },
  starter: { label: 'Starter members only', lists: ['Starter members'], theme: 'personal' },
  guides: { label: 'Single guide buyers (£9 guides)', lists: ['Single guide buyers'], theme: 'personal' },
  parents: { label: 'Parent guide buyers', lists: ['Parent guide buyers'], theme: 'parents' },
  business: { label: 'Business contacts', lists: ['Business contacts'], theme: 'business' },
};
export const ALL_LISTS = ['Starter members', 'Plus members', 'Single guide buyers', 'Parent guide buyers', 'Business contacts'];
