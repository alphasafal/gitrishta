// @vitest-environment node
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import type { Font } from '../src/server/og';
import { esc, handleShare, siteOrigin } from '../src/server/share';
import { rawEvents, rawRepos, rawUser } from './fixtures';

const font = (f: string, name: string, weight: 400 | 600): Font =>
  ({ name, weight, style: 'normal', data: new Uint8Array(readFileSync(`assets/fonts/${f}`)).buffer });
const fonts = async () => [font('yatra-one-latin-400-normal.woff', 'Yatra One', 400), font('mukta-latin-400-normal.woff', 'Mukta', 400), font('mukta-latin-600-normal.woff', 'Mukta', 600)];
const PNG = new Uint8Array(readFileSync("test/avatar.png"));
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { 'content-type': 'application/json' } });
const req = (path: string) => new Request(`https://gitrishta.vercel.app${path}`);

let n = 0;
const uniq = () => `user-${++n}-${Date.now() % 1e6}`; // fetchProfile caches by login
function github(login: string, extra: (url: string, init?: RequestInit) => Response | undefined = () => undefined) {
  return vi.fn(async (input: string | URL, init?: RequestInit) => {
    const url = String(input);
    const hit = extra(url, init);
    if (hit) return hit;
    if (url.startsWith('https://avatars.githubusercontent.com/')) return new Response(PNG, { headers: { 'content-type': 'image/png' } });
    if (url.includes('/repos?')) return json(rawRepos());
    if (url.includes('/events/')) return json(rawEvents());
    if (url.endsWith(`/users/${login}`)) return json(rawUser({ login }));
    return json({ message: 'Not Found' }, 404);
  });
}

// @vercel/og's Node build calls require(); Vercel runs it on the Edge build instead.
const g = globalThis as { require?: unknown; __dirname?: string };
g.require ??= createRequire(import.meta.url);
g.__dirname ??= `${process.cwd()}/node_modules/@vercel/og/dist`;
const { fetchAvatar, handleOg } = await import('../src/server/og');

afterEach(() => vi.unstubAllGlobals());

describe('/s/<user> share page', () => {
  it('emits per-user preview tags and a same-site redirect', async () => {
    const f = vi.fn();
    vi.stubGlobal('fetch', f);
    const r = handleShare(req('/api/share?u=octo-cat&m=hubot&t=south&l=hi'));
    const html = await r.text();
    expect(r.headers.get('content-type')).toContain('text/html');
    expect(html).toContain('content="https://gitrishta.vercel.app/api/og?u=octo-cat&amp;m=hubot"');
    expect(html).toContain('url=/?u=octo-cat&amp;m=hubot&amp;t=south&amp;l=hi');
    expect(f).not.toHaveBeenCalled(); // never spends GitHub quota
  });

  it.each([
    '/api/share?u=%3Cscript%3E', '/api/share?u=a%22%3E%3Cimg', '/api/share?u=//evil.com', '/api/share?u=a&m=../x',
    '/api/share?u=https://evil.com/a', '/api/share',
  ])('rejects %s with a redirect home and no HTML', (p) => {
    const r = handleShare(req(p));
    expect(r.status).toBe(302);
    expect(r.headers.get('location')).toBe('/');
    expect(r.body).toBeNull();
  });

  it('drops unknown themes and never redirects off-site', async () => {
    const html = await handleShare(req('/api/share?u=octo&t=%22%3E%3Cscript%3Ealert(1)%3C/script%3E')).text();
    expect(html).not.toContain('<script');
    expect(html).toMatch(/url=\/\?u=octo"/);
  });

  it('only trusts a clean configured origin', () => {
    expect(siteOrigin('https://x.vercel.app/a', 'https://gitrishta.in/')).toBe('https://gitrishta.in');
    expect(siteOrigin('https://x.vercel.app/a', 'https://evil.com/"><script>')).toBe('https://x.vercel.app');
    expect(esc(`"<>'&`)).toBe('&quot;&lt;&gt;&#39;&amp;');
  });
});

describe('/api/og preview image', () => {
  it('rejects invalid usernames before touching the network', async () => {
    const f = vi.fn();
    vi.stubGlobal('fetch', f);
    for (const p of ['/api/og', '/api/og?u=../../repos/a/b', '/api/og?u=a&m=%3Cx%3E', '/api/og?u=a%2F..']) {
      const r = await handleOg(req(p), { fonts });
      expect(r.status).toBe(400);
    }
    expect(f).not.toHaveBeenCalled();
  });

  it('renders a cached PNG for a biodata and a kundli', async () => {
    const a = uniq(), b = uniq();
    const f = github(a, (url) => (url.endsWith(`/users/${b}`) ? json(rawUser({ login: b })) : undefined));
    vi.stubGlobal('fetch', f);
    for (const p of [`/api/og?u=${a}`, `/api/og?u=${a}&m=${b}`]) {
      const r = await handleOg(req(p), { fonts });
      const body = new Uint8Array(await r.arrayBuffer());
      expect(r.headers.get('content-type')).toBe('image/png');
      expect(r.headers.get('cache-control')).toContain('s-maxage=86400');
      expect([...body.slice(0, 4)]).toEqual([137, 80, 78, 71]);
    }
    for (const [url] of f.mock.calls) expect(['api.github.com', 'avatars.githubusercontent.com']).toContain(new URL(String(url)).hostname);
  }, 30_000);

  it('sends the token to api.github.com only, never to the avatar host', async () => {
    const a = uniq();
    const f = github(a);
    vi.stubGlobal('fetch', f);
    await (await handleOg(req(`/api/og?u=${a}`), { fonts, token: 'test-token' })).arrayBuffer();
    for (const [url, init] of f.mock.calls as unknown as [string, RequestInit | undefined][]) {
      const auth = new Headers(init?.headers).get('authorization');
      expect(auth).toBe(new URL(String(url)).hostname === 'api.github.com' ? 'Bearer test-token' : null);
    }
  }, 30_000);

  it('falls back to a short-cached brand image when GitHub fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({}, 500)));
    const r = await handleOg(req(`/api/og?u=${uniq()}`), { fonts });
    expect(r.headers.get('content-type')).toBe('image/png');
    expect((await r.arrayBuffer()).byteLength).toBeGreaterThan(1000);
    expect(r.headers.get('cache-control')).toContain('s-maxage=600');
  }, 30_000);
});

describe('fetchAvatar', () => {
  it('refuses other hosts without fetching', async () => {
    const f = vi.fn();
    vi.stubGlobal('fetch', f);
    for (const u of ['https://evil.com/a.png', 'http://avatars.githubusercontent.com/u/1', 'https://169.254.169.254/latest', 'file:///etc/passwd', null]) {
      expect(await fetchAvatar(u)).toBeNull();
    }
    expect(f).not.toHaveBeenCalled();
  });

  it('refuses non-images, SVG and oversized bodies, and follows no redirects', async () => {
    const src = 'https://avatars.githubusercontent.com/u/1?v=4';
    const cases: Response[] = [
      new Response('<svg onload=x>', { headers: { 'content-type': 'image/svg+xml' } }),
      new Response('<html>', { headers: { 'content-type': 'text/html' } }),
      new Response(new Uint8Array(1_000_001), { headers: { 'content-type': 'image/png' } }),
    ];
    for (const res of cases) {
      vi.stubGlobal('fetch', vi.fn(async () => res));
      expect(await fetchAvatar(src)).toBeNull();
    }
    const f = vi.fn(async () => new Response(PNG, { headers: { 'content-type': 'image/png' } }));
    vi.stubGlobal('fetch', f);
    expect(await fetchAvatar(src)).toMatch(/^data:image\/png;base64,/);
    expect((f.mock.calls[0] as unknown as [URL, RequestInit])[1].redirect).toBe('error');
  });
});
