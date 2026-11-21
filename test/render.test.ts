import { describe, expect, it } from 'vitest';
import { buildBiodata, matchKundli } from '../src/biodata';
import { h } from '../src/dom';
import { renderBiodata, renderMatch, type Opts } from '../src/render';

const O: Opts = { site: 'site', theme: 'north', hindi: false };
import { profile } from './fixtures';

const XSS = '<img src=x onerror="window.pwned=1"><script>window.pwned=1</script>';
const evil = () => profile(
  { name: XSS, bio: XSS, location: XSS, company: XSS, avatar_url: 'https://evil.example/x.png' },
  [{ name: XSS, fork: false, stargazers_count: 9, language: XSS, license: { spdx_id: XSS }, created_at: '2015-01-01T00:00:00Z' }],
);

describe('rendering untrusted GitHub data', () => {
  it('renders hostile strings as text, never as markup', () => {
    const el = renderBiodata(buildBiodata(evil()), O);
    document.body.replaceChildren(el);
    expect(el.querySelectorAll('script, iframe, object, [onerror], [onload]')).toHaveLength(0);
    expect(el.querySelectorAll('img')).toHaveLength(0); // the evil avatar host is dropped too
    expect(el.textContent).toContain('<script>window.pwned=1</script>');
    expect((window as any).pwned).toBeUndefined();
  });

  it('only renders the real GitHub avatar host', () => {
    const el = renderBiodata(buildBiodata(profile()), O);
    const imgs = [...el.querySelectorAll('img')];
    expect(imgs).toHaveLength(1);
    expect(new URL(imgs[0]!.getAttribute('src')!).hostname).toBe('avatars.githubusercontent.com');
  });

  it('links only to github.com profiles', () => {
    const el = renderMatch(buildBiodata(evil()), buildBiodata(profile()), matchKundli(evil(), profile()), O);
    document.body.replaceChildren(el, renderBiodata(buildBiodata(evil()), O));
    for (const a of document.querySelectorAll('a')) {
      expect(new URL(a.href).origin).toBe('https://github.com');
      expect(a.rel).toContain('noopener');
    }
  });
});

describe('h()', () => {
  it('refuses event-handler and style attributes', () => {
    expect(() => h('div', { onclick: 'x()' })).toThrow();
    expect(() => h('div', { style: 'x' })).toThrow();
  });
  it('drops javascript: and data: URLs', () => {
    expect(h('a', { href: 'javascript:alert(1)' }).hasAttribute('href')).toBe(false);
    expect(h('img', { src: 'data:image/svg+xml,<svg onload=alert(1)>' }).hasAttribute('src')).toBe(false);
  });
});

describe('themes and Hindi labels', () => {
  it('swaps labels to Devanagari but keeps values and theme', () => {
    const el = renderBiodata(buildBiodata(profile()), { site: 's', theme: 'south', hindi: true });
    expect(el.dataset.theme).toBe('south');
    const dts = [...el.querySelectorAll('dt')].map((d) => d.textContent);
    expect(dts).toContain('गोत्र');
    expect(dts).not.toContain('Gotra');
    expect(el.textContent).toContain('TypeScript');
  });
});
