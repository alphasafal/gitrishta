# Security policy

## Reporting a vulnerability

Please report security issues privately through [GitHub's private vulnerability reporting](https://github.com/alphasafal/gitrishta/security/advisories/new), not in a public issue. You should get a reply within 3 days.

## Scope

GitRishta is a static site. It has no backend, no accounts, no secrets and stores nothing. The interesting attack surface is:

- **Rendering untrusted GitHub data** (names, bios, repo names, URLs). All of it is rendered as text through `src/dom.ts`, which has no HTML sink and an attribute allow-list.
- **URLs from profiles**. Only `http(s)` links are kept (`safeUrl` in `src/github.ts`), and avatars must come from `https://avatars.githubusercontent.com`.
- **Usernames in the URL**. They are validated against GitHub's username rules before any request is made.
- **The Content Security Policy** in `index.html`: no inline scripts or styles, Trusted Types enforced, and network access limited to the GitHub API and avatar host.
- **CI and deployment**: actions are pinned to commit SHAs and each job gets only the permissions it needs.

## Known limitations

GitHub Pages cannot set HTTP headers, so the CSP is delivered as a `<meta>` tag. That means `frame-ancestors` (clickjacking protection) is not enforced. The page has no state-changing actions, so the risk is low.
