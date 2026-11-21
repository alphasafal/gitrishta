import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchProfile, GhError, normUser, parseUsername, safeUrl } from '../src/github';
import { rawEvents, rawRepos, rawUser } from './fixtures';

describe('parseUsername', () => {
  it.each([
    ['torvalds', 'torvalds'], ['@gaearon', 'gaearon'], ['https://github.com/sindre-sorhus/', 'sindre-sorhus'],
    ['github.com/a', 'a'], ['  Alpha-Safal ', 'Alpha-Safal'], ['a'.repeat(39), 'a'.repeat(39)],
  ])('accepts %s', (i, o) => expect(parseUsername(i)).toBe(o));

  it.each([
    '', '-a', 'a-', 'a--b', 'a'.repeat(40), '../users', 'a/b', 'a?x=1', 'a#b', '<script>', 'a b', 'a%2F..',
    'https://evil.com/a', 'javascript:alert(1)', null, 42, 'x'.repeat(10_000),
  ])('rejects %s', (i) => expect(parseUsername(i)).toBeNull());

  it('does not backtrack on long hostile input', () => {
    const t = performance.now();
    for (let i = 0; i < 200; i++) parseUsername('a-'.repeat(19) + '!');
    expect(performance.now() - t).toBeLessThan(200);
  });
});

describe('safeUrl', () => {
  it.each(['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html,<script>', 'vbscript:x', 'file:///etc/passwd'])(
    'drops %s', (u) => expect(safeUrl(u)).toBeNull());
  it('keeps http(s) and adds https to bare hosts', () => {
    expect(safeUrl('octo.dev')).toBe('https://octo.dev/');
    expect(safeUrl('http://x.com/a')).toBe('http://x.com/a');
  });
  it('pins avatar host and https', () => {
    expect(safeUrl('https://evil.com/a.png', 'avatars.githubusercontent.com')).toBeNull();
    expect(safeUrl('http://avatars.githubusercontent.com/u/1', 'avatars.githubusercontent.com')).toBeNull();
    expect(safeUrl('https://avatars.githubusercontent.com.evil.com/u/1', 'avatars.githubusercontent.com')).toBeNull();
  });
});

describe('normUser', () => {
  it('truncates and type-checks hostile fields', () => {
    const u = normUser(rawUser({ bio: 'x'.repeat(5000), name: { evil: 1 }, followers: -5, public_repos: 'NaN', blog: 'javascript:alert(1)', twitter_username: '<b>' }));
    expect(u.bio).toHaveLength(200);
    expect(u.name).toBeNull();
    expect(u.followers).toBe(0);
    expect(u.repos).toBe(0);
    expect(u.blog).toBeNull();
    expect(u.twitter).toBeNull();
  });
});

describe('fetchProfile', () => {
  afterEach(() => vi.unstubAllGlobals());
  const json = (b: unknown, status = 200, headers: Record<string, string> = {}) =>
    new Response(JSON.stringify(b), { status, headers: { 'content-type': 'application/json', ...headers } });

  it('never calls the network for an invalid username', async () => {
    const f = vi.fn();
    vi.stubGlobal('fetch', f);
    for (const bad of ['../../repos/x/y', 'a/b', '<img>', 'a?per_page=1']) {
      await expect(fetchProfile(bad)).rejects.toMatchObject({ kind: 'invalid' });
    }
    expect(f).not.toHaveBeenCalled();
  });

  it('only calls api.github.com, without cookies', async () => {
    const f = vi.fn(async (url: string) => (url.includes('/repos') ? json(rawRepos()) : url.includes('/events') ? json(rawEvents()) : json(rawUser())));
    vi.stubGlobal('fetch', f);
    const p = await fetchProfile('octo-cat');
    expect(p.user.login).toBe('octo-cat');
    for (const [url, init] of f.mock.calls as unknown as [string, RequestInit][]) {
      expect(new URL(url).origin).toBe('https://api.github.com');
      expect(init.credentials).toBe('omit');
    }
  });

  it('maps 404 and rate limits to friendly errors', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ message: 'Not Found' }, 404)));
    await expect(fetchProfile('nobody-here')).rejects.toMatchObject({ kind: 'notfound' });
    vi.stubGlobal('fetch', vi.fn(async () => json({}, 403, { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '1700000000' })));
    const e = await fetchProfile('limited-user').catch((x) => x);
    expect(e).toBeInstanceOf(GhError);
    expect(e.kind).toBe('ratelimit');
    expect(e.reset.getTime()).toBe(1_700_000_000_000);
  });

  it('still works if repos and events fail', async () => {
    vi.stubGlobal('fetch', vi.fn(async (u: string) => (u.endsWith('/partial-user') ? json(rawUser({ login: 'partial-user' })) : json({}, 500))));
    const p = await fetchProfile('partial-user');
    expect(p.repos).toEqual([]);
    expect(p.pushes).toEqual([]);
  });
});
