import { describe, expect, it } from 'vitest';
import { buildBiodata, matchKundli } from '../src/biodata';
import { badgeMarkdown, biodataText, matchText } from '../src/share';
import { profile } from './fixtures';

describe('share text', () => {
  const b = buildBiodata(profile()), url = 'https://gitrishta.vercel.app/s/octo-cat';
  it('builds a WhatsApp biodata with the share link', () => {
    const t = biodataText(b, url);
    expect(t).toContain('*GitHub Biodata: Octo Cat* (@octo-cat)');
    expect(t).toContain('🪷 Gotra: TypeScript');
    expect(t.endsWith(url)).toBe(true);
  });
  it('builds a kundli summary with all five kootas', () => {
    const t = matchText(b, b, matchKundli(profile(), profile()), url);
    expect(t.match(/Koota: \d+\/\d+/g)).toHaveLength(5);
  });
  it('builds a shields.io badge that links back', () => {
    const md = badgeMarkdown(b, url);
    expect(md).toMatch(/^\[!\[GitRishta: \d+\/36 gunas\]\(https:\/\/img\.shields\.io\/static\/v1\?label=GitRishta&message=\d+%2F36\+gunas&color=7a1f2b&logo=github\)\]\(https:\/\/gitrishta\.vercel\.app\/s\/octo-cat\)$/);
  });
});
