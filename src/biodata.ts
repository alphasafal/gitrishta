import type { Profile } from './github';
import * as J from './jokes';

export type Row = [label: string, value: string];
export interface Section { title: string; hindi: string; rows: Row[] }
export interface Biodata {
  login: string; name: string; avatar: string | null; profileUrl: string; bio: string | null;
  sections: Section[]; expectations: string[]; gunas: number; verdict: string;
}

// Same username always gives the same biodata, so shared links stay consistent.
function rng(seed: string) {
  let h = 2166136261;
  for (const c of seed.toLowerCase()) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = <T>(r: () => number, a: T[]): T => a[Math.floor(r() * a.length)]!;
const pickN = <T>(r: () => number, a: T[], n: number): T[] =>
  a.map((v) => [r(), v] as const).sort((x, y) => x[0] - y[0]).slice(0, n).map((x) => x[1]);
const fmt = (n: number) => n.toLocaleString('en-IN');
const plural = (n: number, w: string) => `${fmt(n)} ${w}${n === 1 ? '' : 's'}`;

const istHour = (d: Date) => Math.floor(((d.getTime() / 3.6e6 + 5.5) % 24 + 24) % 24);
const hourLabel = (h: number) => `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}`;

/** Peak commit hour in IST, or null if there is no public push activity. */
export function peakHour(pushes: Date[]): number | null {
  if (!pushes.length) return null;
  const c = new Array<number>(24).fill(0);
  for (const d of pushes) c[istHour(d)]!++;
  return c.indexOf(Math.max(...c));
}

function rashi(d: Date): [string, string] {
  // Sun-sign boundaries; index 0 = Capricorn (Dec 22 - Jan 19).
  const cut = [20, 19, 21, 20, 21, 21, 23, 23, 23, 23, 22, 22];
  const m = d.getUTCMonth();
  const i = (d.getUTCDate() >= cut[m]! ? m + 1 : m) % 12;
  return J.RASHI[i]!;
}

export function stats(p: Profile) {
  const own = p.repos.filter((r) => !r.fork);
  const count = (xs: (string | null)[]) => {
    const m = new Map<string, number>();
    for (const x of xs) if (x) m.set(x, (m.get(x) ?? 0) + 1);
    return [...m].sort((a, b) => b[1] - a[1]).map(([k]) => k);
  };
  const byStars = [...own].sort((a, b) => b.stars - a.stars);
  return {
    own, forks: p.repos.length - own.length, archived: own.filter((r) => r.archived).length,
    langs: count(own.map((r) => r.language)), license: count(own.map((r) => r.license))[0] ?? null,
    stars: own.reduce((s, r) => s + r.stars, 0), top: byStars[0]?.stars ? byStars[0] : null,
    oldest: [...own].sort((a, b) => +a.created - +b.created)[0] ?? null,
    peak: peakHour(p.pushes),
    weekend: p.pushes.length ? p.pushes.filter((d) => [0, 6].includes(new Date(+d + 1.98e7).getUTCDay())).length / p.pushes.length : 0,
  };
}

function gunas(p: Profile, s: ReturnType<typeof stats>): number {
  const u = p.user;
  const pts = [
    Math.min(8, Math.log2(1 + s.stars)),            // well settled
    Math.min(7, Math.log2(1 + u.followers)),         // family reputation
    Math.min(7, p.pushes.length / 8),                // currently active
    Math.min(6, s.own.length / 5),                   // property
    [u.name, u.bio, u.location, u.company].filter(Boolean).length * 1.5, // complete biodata
    s.langs.length > 2 ? 2 : s.langs.length,         // versatile
  ];
  return Math.max(8, Math.min(36, Math.round(pts.reduce((a, b) => a + b, 0))));
}

export const verdictFor = (g: number) =>
  g >= 30 ? 'Uttam rishta! Book the shaadi hall and a monorepo.'
    : g >= 22 ? 'Accha rishta. Mummy is impressed, papa wants more stars.'
      : g >= 15 ? 'Chalega. Thoda aur commit karo, beta.'
        : 'Rishta under review. Please push some code first.';

export function buildBiodata(p: Profile): Biodata {
  const u = p.user, s = stats(p), r = rng(u.login);
  const age = Math.max(0, Math.floor((Date.now() - +u.created) / 3.156e10));
  const lang = s.langs[0] ?? null;
  const [rName, rTrait] = rashi(u.created);
  const nak = s.peak === null
    ? 'Gupt Nakshatra: commits in secret (private repos only?)'
    : J.NAKSHATRA.find(([max]) => s.peak! < max)![1].replace('{h}', hourLabel(s.peak));

  const pkg = s.stars >= 1000 ? 'very well settled, NRI-level'
    : s.stars >= 100 ? 'decent, own house (repo) also' : 'in-hand is low but potential is very high';
  const fam = u.following > Math.max(10, u.followers * 3)
    ? `${plural(u.followers, 'follower')}, but follows ${fmt(u.following)} (family is worried)`
    : `Joint family of ${plural(u.followers, 'follower')}`;

  const hobbies = pickN(r, J.HOBBIES, 2);
  if (s.weekend > 0.3) hobbies.unshift('Codes on weekends too, very hard-working');
  if (s.peak !== null && s.peak < 5) hobbies.unshift('Night shifts with the rubber duck');

  const exp = pickN(r, J.EXPECTATIONS, 3);
  exp.unshift(lang
    ? `Must respect ${lang}${lang === 'PHP' ? '' : '. PHP wale bhi chalenge, adjust kar lenge'}`
    : 'Must love Markdown, because that is all I write');
  if (u.repos > 0) exp.push(`Should star all ${plural(u.repos, 'repo')} before the roka`);

  const g = gunas(p, s);
  return {
    login: u.login, name: u.name ?? u.login, avatar: u.avatar, bio: u.bio,
    profileUrl: `https://github.com/${encodeURIComponent(u.login)}`,
    gunas: g, verdict: verdictFor(g), expectations: exp.slice(0, 5),
    sections: [
      { title: 'Personal Details', hindi: 'व्यक्तिगत विवरण', rows: [
        ['Name', u.name ?? u.login],
        ['Ghar ka naam', `@${u.login}`],
        ['Janm tithi', `${u.created.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' })} (${age} saal on GitHub)`],
        ['Janm sthaan', u.location ?? 'localhost:3000'],
        ['Height', `${plural(u.repos, 'repo')} tall${u.repos >= 50 ? ', family is very proud' : ''}`],
        ['Gotra', lang ?? 'Markdown (only READMEs, no code)'],
        ['Rashi', `${rName}: ${rTrait}`],
        ['Nakshatra', nak],
        ['Manglik', pick(r, J.MANGLIK)],
        ['Diet', (lang && J.DIET[lang]) || J.DIET_DEFAULT],
      ] },
      { title: 'Education & Career', hindi: 'शिक्षा एवं व्यवसाय', rows: [
        ['Education', pick(r, J.EDUCATION)],
        ['Occupation', u.company ? `Works at ${u.company}` : u.hireable ? 'Open to work (and to rishtas)' : pick(r, J.OCCUPATION)],
        ['Package', `${fmt(s.stars)} ⭐ per annum, ${pkg}`],
        ['Settled in', s.top ? `${s.top.name} (${fmt(s.top.stars)} ⭐)` : 'Still searching for the one repo'],
        ['Languages', s.langs.slice(0, 4).join(', ') || 'Only speaks emoji'],
      ] },
      { title: 'Family Background', hindi: 'पारिवारिक विवरण', rows: [
        ['Pitaji', pick(r, J.FATHER)],
        ['Mataji', pick(r, J.MOTHER)],
        ['Bhai-behen', s.forks ? `${plural(s.forks, 'forked repo')} (cousins, technically)` : 'Only child, no forks'],
        ['Family', fam],
        ['Jaaydaad', s.oldest ? `${s.oldest.name}, est. ${s.oldest.created.getUTCFullYear()}` : 'Will inherit future repos'],
        ['Family values', s.license ? J.LICENSE[s.license] ?? `${s.license}: unique family traditions` : J.LICENSE_NONE],
        ...(s.archived ? [['Late relatives', `${plural(s.archived, 'archived repo')}, may they rest in peace`] as Row] : []),
      ] },
      { title: 'Hobbies & Habits', hindi: 'शौक़', rows: [
        ['Shauk', hobbies.slice(0, 3).join('; ')],
        ['Drinks', pick(r, J.DRINKS)],
        ['Smokes', pick(r, J.SMOKES)],
      ] },
    ],
  };
}

export interface Match { score: number; verdict: string; parts: Row[] }

/** Kundli Milan between two developers: 36 gunas, fully deterministic. */
export function matchKundli(a: Profile, b: Profile): Match {
  const sa = stats(a), sb = stats(b);
  const la = new Set(sa.langs.slice(0, 5)), common = sb.langs.slice(0, 5).filter((l) => la.has(l));
  const lang = Math.round(12 * common.length / Math.max(1, Math.min(la.size, sb.langs.slice(0, 5).length)));
  const dh = sa.peak === null || sb.peak === null ? 12 : Math.min(Math.abs(sa.peak - sb.peak), 24 - Math.abs(sa.peak - sb.peak));
  const time = Math.round(8 * (1 - dh / 12));
  const lic = sa.license && sa.license === sb.license ? 6 : sa.license && sb.license ? 3 : 1;
  const ratio = (x: number, y: number) => (x + y ? Math.min(x, y) / Math.max(x, y) : 1);
  const act = Math.round(5 * ratio(a.pushes.length, b.pushes.length));
  const fame = Math.round(5 * ratio(Math.log1p(sa.stars), Math.log1p(sb.stars)));
  const score = Math.max(4, Math.min(36, lang + time + lic + act + fame));
  return {
    score,
    verdict: score >= 28 ? 'Uttam milan! Shaadi pakki, monorepo bhi.'
      : score >= 18 ? 'Chalega. Some merge conflicts expected, but love will resolve them.'
        : 'Not compatible. One uses tabs, the other uses spaces.',
    parts: [
      ['Bhasha milan (languages)', `${lang}/12${common.length ? `: both speak ${common.join(', ')}` : ': no common language, will need a translator'}`],
      ['Samay milan (commit hours)', `${time}/8${sa.peak === null || sb.peak === null ? ': someone commits in secret' : dh === 12 ? ': opposite schedules, perfect for 24/7 on-call' : `: commit ${dh}h apart`}`],
      ['Sanskaar (license)', `${lic}/6${lic === 6 ? `: both ${sa.license}` : ': different family values'}`],
      ['Mehnat (activity)', `${act}/5`],
      ['Shohrat (stars)', `${fame}/5`],
    ],
  };
}
