# Easy Start AI website

The website for Mike's friendly AI help business. It's a single page, `index.html`, with no build step.

Hosted on Cloudflare Pages: any change saved here goes live automatically.

The password lock is switched off for now. Search engines are still asked not to list the site (robots.txt and a noindex tag). The old lock code is in the git history if we want it back.

## Launch checklist (members and payments)
- Merge dev into main so /welcome/ and /members/ exist on the live site (Stripe redirects to easystartai.co.uk/welcome/).
- Swap the seven Stripe TEST links in the PAY list in index.html for live-mode links.
- Set up Cloudflare Access for easystartai.co.uk/members paths (same apps as on dev).
- Check CF_API_TOKEN (secret) and CF_ACCOUNT_ID (text) exist for the **Production** environment too (Pages Settings, environment dropdown). dev uses the Preview copies; the live site needs Production ones or the library can't show plans. Test at easystartai.co.uk/members/me (should say "configured":true).
- Switch on search indexing: remove the noindex tag and allow robots.txt.
- Check the Privacy page (/privacy/) wording, add a legal name and ICO registration number.

## Pip question log (content ideas)
Every question asked to Pip is saved anonymously (date, section, question, whether Pip had an answer, whether it was after the free limit). Emails and phone numbers are blanked out, no IP or ID is kept, and rows older than 12 months are deleted. Mike reviews them on /members/admin under "What people ask Pip", and can download a CSV.

One-off setup in Cloudflare (about 5 minutes, no secrets):
1. Storage & databases > D1 SQL database > Create. Name it `pip-questions`.
2. Workers & Pages > aiwebsite > Settings > Bindings > Add > D1 database. Variable name `PIP_DB`, database `pip-questions`. Do this for both Production and Preview.
3. Deployments > latest dev deployment > Retry deployment.
Until this is done, Pip works as normal and nothing is saved.
