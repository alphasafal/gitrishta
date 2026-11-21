# Security policy

## Reporting a vulnerability

Please report security issues privately through [GitHub's private vulnerability reporting](https://github.com/alphasafal/gitrishta/security/advisories/new), not in a public issue. You should get a reply within 3 days.

## Scope

GitRishta is a static site on Vercel with two small Edge functions. It has no accounts, no database and stores nothing. The interesting attack surface is:

- **Rendering untrusted GitHub data** (names, bios, repo names, URLs). All of it is rendered as text through `src/dom.ts`, which has no HTML sink and an attribute allow-list.
- **URLs from profiles**. Only `http(s)` links are kept (`safeUrl` in `src/github.ts`), and avatars must come from `https://avatars.githubusercontent.com`.
- **Usernames in the URL**. They are validated against GitHub's username rules before any request is made.
- **`/s/<user>` share pages** (`src/server/share.ts`): usernames are validated, every value is HTML-escaped, the redirect is always same-site, and the page never calls GitHub.
- **`/api/og` preview images** (`src/server/og.ts`): a fixed SVG template where every string is escaped, rasterised by resvg (no scripts, no network). Avatars are fetched only from `avatars.githubusercontent.com`, as PNG or JPEG under 1 MB, with redirects refused. The optional `GITHUB_TOKEN` is only ever sent to `api.github.com`.
- **Security headers** in `vercel.json`: CSP with Trusted Types and `frame-ancestors 'none'`, HSTS, `nosniff`, `X-Frame-Options`, a Permissions-Policy and COOP. A Trusted Types default policy (`src/policy.ts`) allows exactly one runtime script URL, Vercel's same-origin analytics.
- **CI and deployment**: actions are pinned to commit SHAs and each job gets only the permissions it needs.

## Known limitations

- Preview images are cached at the edge for a day. Someone can still request many different usernames to spend the GitHub quota; set `GITHUB_TOKEN` and, if needed, a Vercel Firewall rate-limit rule on `/api/og`.
- Analytics are Vercel Web Analytics: cookie-free, and the query string (which holds usernames) is removed before each page view is sent.
