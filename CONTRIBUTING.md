# Contributing

Thanks for helping Pandit ji! 🙏

## Easiest way: add a joke

1. Open [`src/jokes.ts`](src/jokes.ts) and add a line to any list.
2. Keep it kind. We roast code habits (tabs, force-pushes, unread docs), never people, religions, castes, skin colour or bodies.
3. Open a PR.

## Code changes

```bash
npm ci
npm run dev
npm test && npm run build
```

- Never use `innerHTML` or similar. Build elements with `h()` from `src/dom.ts`, which treats every string as text.
- Anything from the GitHub API is untrusted. Normalise it in `src/github.ts`.
- Avoid new runtime dependencies. If you really need one, explain why in the PR.
- Use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages, e.g. `feat: add a new manglik line`, `fix: rashi boundary on 20 Jan`.

## Repo settings (for the maintainer)

- Protect `main`: require PRs, the `CI / check` and `CodeQL` checks, and review from code owners.
- Enable Dependabot alerts, secret scanning with push protection, and private vulnerability reporting.
- Settings → Pages → Source: **GitHub Actions**.
