# Easy Start AI website

The website for Mike's friendly AI help business. It's a single page, `index.html`, with no build step.

Hosted on Cloudflare Pages: any change saved here goes live automatically.

The password lock is switched off for now. Search engines are still asked not to list the site (robots.txt and a noindex tag). The old lock code is in the git history if we want it back.

## Launch checklist (members and payments)
- Merge dev into main so /welcome/ and /members/ exist on the live site (Stripe redirects to easystartai.co.uk/welcome/).
- Swap the seven Stripe TEST links in the PAY list in index.html for live-mode links. (Starter is £10 and Plus £25 since 27 Nov 2026.) Also swap the TEST "member session £35" link in members/plus/before-your-call/index.html.
- Billing portal ("Manage or cancel your plan"): in LIVE Stripe, Settings > Billing > Customer portal, copy the sandbox settings (cancel at end of period, reasons on, no email change, no plan switching), activate the login link, and swap the TEST link `billing.stripe.com/p/login/test_...` in members/index.html, welcome/index.html and terms/index.html. Set the return URL and privacy/terms links to easystartai.co.uk.
- Recreate the Stripe Workflow "Email Mike when a plan ends" in live mode (sandbox workflows don't carry over).
- Automatic list changes (setup guide Part 10): add STRIPE_WEBHOOK_SECRET (live webhook to https://easystartai.co.uk/api/stripe-webhook, events checkout.session.completed, checkout.session.async_payment_succeeded, customer.subscription.deleted) and CF_LIST_TOKEN (Zero Trust: Edit) under Production. Test with one live purchase and check the admin "Automatic list changes" log.
- Purchase alerts (setup guide Part 9): recreate the "New purchase: add to list" workflow in live mode, give every live Payment Link the metadata `add_to_list` (the list name), and add a live restricted key (Checkout Sessions, Products, Prices: Read) as `STRIPE_READ_KEY` under Production for the admin "Recent purchases" panel.
- Emails (setup guide Part 11): add `BREVO_API_KEY` under **Production**, and swap the test portal link in `functions/_email/templates.js` (PORTAL_LINK) for the live one.
- Swap the eight TEST "buy" links in members/library.json (5 Plus guides at £9, 3 parent guides) for live-mode links.
- Set up Cloudflare Access for easystartai.co.uk/members paths (same apps as on dev).
- Check CF_API_TOKEN (secret) and CF_ACCOUNT_ID (text) exist for the **Production** environment too (Pages Settings, environment dropdown). dev uses the Preview copies; the live site needs Production ones or the library can't show plans. Test at easystartai.co.uk/members/me (should say "configured":true).
- Switch on search indexing: remove the noindex tag in index.html and replace robots.txt with the launch version written in its comments (it keeps /members/, /admin/, /welcome/ and /api/ out and points to the sitemap). Then submit https://easystartai.co.uk/sitemap.xml in Google Search Console and Bing Webmaster Tools.
- Legal pages (/privacy/, /terms/, /cookies/): fill every amber [PLACEHOLDER] (legal name, ICO number), then remove the "Draft, not legal advice" banner.
- Cloudflare Access: set Session duration to 30 days on every members app (the Cookies page says 30 days).
- Stripe: Settings > Billing > Subscriptions and emails, turn on "Send emails about upcoming renewals" 7 days before (the Terms promise this).
- Replace the interim address "Wistaston, Cheshire East, CW2" on /privacy/ and /terms/ with the full business address.
- Register as a sole trader with HMRC for Self Assessment (gov.uk/register-for-self-assessment). Deadline is 5 October after the end of the first tax year you trade in.
- Pay the ICO data protection fee (ico.org.uk/fee, about £52 a year) and put the registration number on the Privacy page.
- Stripe Payment Links: turn on "require customers to accept your terms" (link to /terms/), so the digital-content cooling-off waiver is recorded.
- Admin site, live version (admin.easystartai.co.uk), in this order:
  1. Zero Trust > Access controls > Applications > Add > Self-hosted. Name `Admin (live)`, Subdomain `admin`, Domain `easystartai.co.uk`, Path blank. Policy **Mike only**. Identity: One-time PIN only, Instant Auth on.
  2. Workers & Pages > aiwebsite > Custom domains > Set up a custom domain > `admin.easystartai.co.uk`. Leave the DNS target as `aiwebsite-akt.pages.dev` (the live site).
  3. Test in a private window: https://admin.easystartai.co.uk asks for your email code, then shows Mike's admin. https://easystartai.co.uk/admin/ should jump to the admin address.
  4. Keep the dev one (admin-dev) for testing. Delete the old "Mike's file list" app on members/admin if it's still there.

- Visitor numbers: Web Analytics is switched on for the whole Pages project, so it covers the live site automatically. If you used CF_ANALYTICS_TOKEN, add it under **Production** too, then check the Visitors and System health tabs on admin.easystartai.co.uk.
- Pip's AI: add the `ANTHROPIC_API_KEY` secret under **Production** too (Workers & Pages > aiwebsite > Settings > Variables and secrets), redeploy, then press "Check Pip's AI" on admin.easystartai.co.uk.

## Pip's AI answers
`functions/api/pip-chat.js` sends each Pip question to Claude Haiku (Anthropic) with Easy Start AI's rules: short, confidence-building answers, never the full solution, then one suggested next step (a guide, plan, session, call or quote), shown as a button. The product list is `NEXT_STEPS` in that file and `NEXT` in index.html; keep both in step with real prices.
- Needs the `ANTHROPIC_API_KEY` secret (Preview for dev, Production for live). Without it, or if Anthropic fails or credit runs out, Pip uses the pre-written answers.
- 3 free questions per person per day, checked on the server (scrambled IP + date, deleted after 2 days), and at most `PIP_DAILY_CAP` AI answers a day site-wide (default 200).
- Call booking: on Business, the "Book a free discovery call" chip and Pip's "Book a free call" buttons start a short chat (business, size, what takes time, tools), then a form with name, email and good times that emails "[Pip] Discovery call: ..." to hello@. Set CALL_LINK in index.html to a Cal.com link later to send people to a booking calendar instead.
- Quote helper: the "Get a quote for a one-off job" chip (or a tailored_quote suggestion) switches Pip to asking about the job one question at a time (own limit of 15 messages a day, not the 3 free ones, not logged). It ends with a summary form that sends "[Pip] Quote request: ..." to hello@ via Web3Forms. Without the AI key it points to the contact form.
- Setup steps for Mike: `/mnt/project-files/website/pip-ai-setup.md` in the project.

## Admin site (only Mike)
Mike's tools (file list and Pip question log) live in `admin/` and `functions/admin/`. They only open on their own address, and one Cloudflare Access app locks that whole address:
- dev: https://admin-dev.easystartai.co.uk (points at the dev branch)
- live: https://admin.easystartai.co.uk (set up at launch, see the checklist)

On any other address (dev.easystartai.co.uk, easystartai.co.uk, *.pages.dev), /admin/ redirects to the admin address, so it's never open without the lock. The old /members/admin address redirects there too. The admin address's front page goes straight to /admin/.

The admin page has tabs (the address remembers the tab, e.g. `/admin/#health`):
- **Members**: automatic list changes (`/admin/list-log`) and recent Stripe purchases (`/admin/purchases`).
- **Pip**: question log, CSV, "Send a test question", "Check Pip's AI" (`/admin/pip-questions`).
- **Emails**: Brevo lists, welcome previews/tests, "New this month" drafts (`/admin/email`).
- **Visitors**: cookie-free visitor numbers from Cloudflare Web Analytics (`/admin/visitors`, GraphQL `rumPageloadEventsAdaptiveGroups`, admin hosts excluded). Needs Web Analytics switched on for the Pages project and a token with Account Analytics: Read (`CF_ANALYTICS_TOKEN`, or that permission added to `CF_API_TOKEN`). Setup guide Part 12.
- **System health** (`/admin/health`): which settings are present (never their values), one free read-only test call per service (D1, Anthropic models list, Zero Trust lists with each token, Stripe checkout sessions, Brevo lists), Pip AI answers today vs `PIP_DAILY_CAP`, and NEEDS YOU / ERROR rows from the last 30 days. The tab shows a red count when something needs a look.
- **Library files**: who can open each file in `members/library.json`.

## Pip question log (content ideas)
Every question asked to Pip is saved anonymously (date, section, question, whether Pip had an answer, whether it was after the free limit). Emails and phone numbers are blanked out, no IP or ID is kept, and rows older than 12 months are deleted. Mike reviews them on the admin site (see below) under "What people ask Pip", and can download a CSV.

One-off setup in Cloudflare (about 5 minutes, no secrets):
1. Storage & databases > D1 SQL database > Create. Name it `pip-questions`.
2. Workers & Pages > aiwebsite > Settings > Bindings > Add > D1 database. Variable name `PIP_DB`, database `pip-questions`. Do this for both Production and Preview.
3. Deployments > latest dev deployment > Retry deployment.
Until this is done, Pip works as normal and nothing is saved.

## Emails (welcome + "New this month")
`functions/api/stripe-webhook.js` calls `functions/_email/` after each purchase: a branded welcome email per product (once per order, via Brevo), and the buyer is added to the matching Brevo list (Starter members, Plus members, Single guide buyers, Parent guide buyers). When a plan ends they come off the Starter/Plus list. Templates and colours: `functions/_email/templates.js` (Personal teal, Parents amber with the sun band, Business blue). Pictures for emails (PNG, email apps can't show SVG) are in `email/`.
- Needs the `BREVO_API_KEY` secret (a Brevo API key `xkeysib-`, restricted: Transactional email All, Contacts All, Email campaigns Read/write). Without it nothing changes and no email is sent. Brevo disables keys unused for 90 days: opening admin > Emails counts as use.
- Admin (`/admin/` > Emails): preview each welcome email, send yourself a test, create the Brevo lists, and write a "New this month" email that is saved as a Brevo campaign draft (sent from Brevo, with unsubscribe).
- Adding a product: add it to `PRODUCTS` and `KEYS` in `templates.js` too.

## Search (SEO)
- Each section has its own address: /business/, /personal/, /parents/, /tips/, /pricing/, /about/, /contact/. They all serve index.html; `functions/<section>.js` (via `functions/_seo/render.js`) fills in that section's title, description and canonical address and shows that section, so search engines see a real page. Addresses without the last slash redirect to the slash version.
- Old `#business` style links still work everywhere (Stripe redirects, emails, Pip buttons).
- Titles and descriptions: edit the `seoPages` list near the top of index.html. Keep titles under about 60 characters and descriptions under about 155.
- Business details for Google (name, area, prices) are in the `application/ld+json` block in index.html. Keep prices in step with the Pricing table.
- `og-image.png` is the picture shown when the site is shared on LinkedIn, Facebook or WhatsApp. `sitemap.xml` lists the public pages: add each new page to it. `404.html` is the "page not found" page.
