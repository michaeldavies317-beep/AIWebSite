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
