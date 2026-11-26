# Easy Start AI website

The website for Mike's friendly AI help business. It's a single page, `index.html`, with no build step.

Hosted on Cloudflare Pages: any change saved here goes live automatically.

The password lock is switched off for now. Search engines are still asked not to list the site (robots.txt and a noindex tag). The old lock code is in the git history if we want it back.

## Launch checklist (members and payments)
- Merge dev into main so /welcome/ and /members/ exist on the live site (Stripe redirects to easystartai.co.uk/welcome/).
- Swap the seven Stripe TEST links in the PAY list in index.html for live-mode links.
- Billing portal ("Manage or cancel your plan"): in LIVE Stripe, Settings > Billing > Customer portal, copy the sandbox settings (cancel at end of period, reasons on, no email change, no plan switching), activate the login link, and swap the TEST link `billing.stripe.com/p/login/test_...` in members/index.html, welcome/index.html and terms/index.html. Set the return URL and privacy/terms links to easystartai.co.uk.
- Recreate the Stripe Workflow "Email Mike when a plan ends" in live mode (sandbox workflows don't carry over).
- Swap the eight TEST "buy" links in members/library.json (5 Plus guides at £9, 3 parent guides) for live-mode links.
- Set up Cloudflare Access for easystartai.co.uk/members paths (same apps as on dev).
- Check CF_API_TOKEN (secret) and CF_ACCOUNT_ID (text) exist for the **Production** environment too (Pages Settings, environment dropdown). dev uses the Preview copies; the live site needs Production ones or the library can't show plans. Test at easystartai.co.uk/members/me (should say "configured":true).
- Switch on search indexing: remove the noindex tag and allow robots.txt.
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

- Pip's AI: add the `ANTHROPIC_API_KEY` secret under **Production** too (Workers & Pages > aiwebsite > Settings > Variables and secrets), redeploy, then press "Check Pip's AI" on admin.easystartai.co.uk.

## Pip's AI answers
`functions/api/pip-chat.js` sends each Pip question to Claude Haiku (Anthropic) with Easy Start AI's rules: short, confidence-building answers, never the full solution, then one suggested next step (a guide, plan, session, call or quote), shown as a button. The product list is `NEXT_STEPS` in that file and `NEXT` in index.html; keep both in step with real prices.
- Needs the `ANTHROPIC_API_KEY` secret (Preview for dev, Production for live). Without it, or if Anthropic fails or credit runs out, Pip uses the pre-written answers.
- 3 free questions per person per day, checked on the server (scrambled IP + date, deleted after 2 days), and at most `PIP_DAILY_CAP` AI answers a day site-wide (default 200).
- Quote helper: the "Get a quote for a one-off job" chip (or a tailored_quote suggestion) switches Pip to asking about the job one question at a time (own limit of 15 messages a day, not the 3 free ones, not logged). It ends with a summary form that sends "[Pip] Quote request: ..." to hello@ via Web3Forms. Without the AI key it points to the contact form.
- Setup steps for Mike: `/mnt/project-files/website/pip-ai-setup.md` in the project.

## Admin site (only Mike)
Mike's tools (file list and Pip question log) live in `admin/` and `functions/admin/`. They only open on their own address, and one Cloudflare Access app locks that whole address:
- dev: https://admin-dev.easystartai.co.uk (points at the dev branch)
- live: https://admin.easystartai.co.uk (set up at launch, see the checklist)

On any other address (dev.easystartai.co.uk, easystartai.co.uk, *.pages.dev), /admin/ redirects to the admin address, so it's never open without the lock. The old /members/admin address redirects there too. The admin address's front page goes straight to /admin/.

## Pip question log (content ideas)
Every question asked to Pip is saved anonymously (date, section, question, whether Pip had an answer, whether it was after the free limit). Emails and phone numbers are blanked out, no IP or ID is kept, and rows older than 12 months are deleted. Mike reviews them on the admin site (see below) under "What people ask Pip", and can download a CSV.

One-off setup in Cloudflare (about 5 minutes, no secrets):
1. Storage & databases > D1 SQL database > Create. Name it `pip-questions`.
2. Workers & Pages > aiwebsite > Settings > Bindings > Add > D1 database. Variable name `PIP_DB`, database `pip-questions`. Do this for both Production and Preview.
3. Deployments > latest dev deployment > Retry deployment.
Until this is done, Pip works as normal and nothing is saved.
