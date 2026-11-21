import { describe, expect, it } from 'vitest';
import { buildBiodata, matchKundli, peakHour } from '../src/biodata';
import { profile } from './fixtures';

const row = (b: ReturnType<typeof buildBiodata>, k: string) => b.sections.flatMap((s) => s.rows).find((r) => r[0] === k)?.[1];

describe('buildBiodata', () => {
  it('is deterministic per username', () => {
    expect(buildBiodata(profile())).toEqual(buildBiodata(profile()));
  });

  it('reads real signals from the profile', () => {
    const b = buildBiodata(profile());
    expect(row(b, 'Gotra')).toBe('TypeScript');
    expect(row(b, 'Package')).toMatch(/^123 ⭐/);
    expect(row(b, 'Bhai-behen')).toMatch(/^1 forked repo /);
    expect(row(b, 'Khandaani jaaydaad')).toBe('dotfiles, est. 2015');
    expect(row(b, 'Nakshatra')).toMatch(/Ullu.*2 AM/);
    expect(row(b, 'Occupation')).toBe('Works at github');
    expect(row(b, 'Rashi')).toMatch(/^Meen/); // 12 March
  });

  it('copes with an empty profile', () => {
    const b = buildBiodata(profile({ name: null, bio: null, location: null, company: null, public_repos: 0, followers: 0 }, [], []));
    expect(b.name).toBe('octo-cat');
    expect(row(b, 'Gotra')).toMatch(/Markdown/);
    expect(b.gunas).toBeGreaterThanOrEqual(8);
  });

  it('keeps gunas in range', () => {
    const big = profile({ followers: 1e7 }, Array.from({ length: 100 }, (_, i) => ({ name: `r${i}`, stargazers_count: 1e6, language: 'Go' })));
    expect(buildBiodata(big).gunas).toBeLessThanOrEqual(36);
  });
});

describe('peakHour', () => {
  it('converts to IST', () => {
    expect(peakHour([new Date('2024-01-01T20:30:00Z')])).toBe(2);
    expect(peakHour([new Date('2024-01-01T03:30:00Z')])).toBe(9);
    expect(peakHour([])).toBeNull();
  });
});

describe('matchKundli', () => {
  it('scores 0-36 and is symmetric enough to be fair', () => {
    const a = profile(), b = profile({ login: 'other' }, [], []);
    for (const m of [matchKundli(a, a), matchKundli(a, b), matchKundli(b, a)]) {
      expect(m.score).toBeGreaterThanOrEqual(4);
      expect(m.score).toBeLessThanOrEqual(36);
    }
    expect(matchKundli(a, a).score).toBe(36);
    expect(matchKundli(a, b).score).toBe(matchKundli(b, a).score);
  });
});
