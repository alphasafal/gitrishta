import { readFileSync } from 'node:fs';
import { test as base, expect, type Page } from '@playwright/test';

// A fake GitHub, so tests never depend on the real API or its rate limit.
const avatar = readFileSync(new URL('./avatar.png', import.meta.url));
const XSS = '<img src=x onerror=alert(1)><script>alert(1)</script>';
const users: Record<string, object> = {
  'pixel-pandit': { login: 'pixel-pandit', name: 'Pixel Pandit', bio: 'Builds tiny tools for big Indian weddings.', company: '@shaadi-labs', location: 'Jaipur', avatar_url: 'https://avatars.githubusercontent.com/u/101', public_repos: 64, followers: 842, following: 31, created_at: '2014-03-14T08:00:00Z' },
  'merge-maharani': { login: 'merge-maharani', name: 'Merge Maharani', location: 'Bengaluru', avatar_url: 'https://avatars.githubusercontent.com/u/102', public_repos: 23, followers: 210, following: 900, created_at: '2018-08-02T08:00:00Z' },
  'xss-tester': { login: 'xss-tester', name: XSS, bio: XSS, location: XSS, blog: 'javascript:alert(1)', avatar_url: 'https://evil.example/a.png', public_repos: 1, created_at: '2020-01-01T00:00:00Z' },
};
const repos = (login: string) => login === 'xss-tester'
  ? [{ name: XSS, language: XSS, license: { spdx_id: XSS }, stargazers_count: 1, created_at: '2020-01-01T00:00:00Z' }]
  : [{ name: 'mehendi-css', language: 'TypeScript', license: { spdx_id: 'MIT' }, stargazers_count: login === 'pixel-pandit' ? 1840 : 140, created_at: '2017-02-01T00:00:00Z' },
    { name: 'kundli-ml', language: 'Python', license: { spdx_id: 'MIT' }, stargazers_count: 230, created_at: '2016-01-01T00:00:00Z' }];
const events = (h: number) => Array.from({ length: 40 }, (_, i) => ({ type: 'PushEvent', created_at: new Date(Date.UTC(2026, 9, 1 + (i % 28), h, 30)).toISOString() }));

export async function mockGitHub(page: Page) {
  const H = { 'access-control-allow-origin': '*', 'content-type': 'application/json' };
  await page.route('https://api.github.com/**', (r) => {
    const [, , login = '', kind] = new URL(r.request().url()).pathname.split('/');
    if (login === 'rate-limited') return r.fulfill({ status: 403, headers: { ...H, 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 1800), 'access-control-expose-headers': 'x-ratelimit-remaining, x-ratelimit-reset' }, body: '{}' });
    if (!users[login]) return r.fulfill({ status: 404, headers: H, body: '{"message":"Not Found"}' });
    const body = kind === 'repos' ? repos(login) : kind === 'events' ? events(login === 'pixel-pandit' ? 20 : 15) : users[login];
    return r.fulfill({ status: 200, headers: H, body: JSON.stringify(body) });
  });
  await page.route('https://avatars.githubusercontent.com/**', (r) => r.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'content-type': 'image/png' }, body: avatar }));
}

/** Fails the test on any page error, dialog (alert) or CSP / Trusted Types violation. */
export const test = base.extend<{ problems: string[] }>({
  problems: async ({ page }, use) => {
    const problems: string[] = [];
    page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
    page.on('dialog', (d) => { problems.push(`dialog: ${d.message()}`); void d.dismiss(); });
    page.on('console', (m) => { if (/Content Security Policy|Trusted Type/i.test(m.text())) problems.push(m.text()); });
    page.on('request', (r) => { if (new URL(r.url()).hostname === 'evil.example') problems.push(`request to ${r.url()}`); });
    await mockGitHub(page);
    await use(problems);
    expect(problems).toEqual([]);
  },
});
export { expect };
