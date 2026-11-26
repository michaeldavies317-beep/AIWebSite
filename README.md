# AI help website

The website for Mike's friendly AI help business. It's a single page, `index.html`, with no build step.

Hosted on Cloudflare Pages: any change saved here goes live automatically.

The site is private for now. Visitors must sign in with the username and password stored in Cloudflare as the secrets `SITE_USER` and `SITE_PASSWORD` (see `functions/_middleware.js`).

To change the password: edit the secret in Cloudflare (Settings, Variables and Secrets), then start a new deployment. Cloudflare only picks up new values on the next deployment.
