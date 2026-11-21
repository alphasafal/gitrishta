// /api/og: the 1200x630 link-preview PNG for a biodata or a kundli match.
// A fixed-layout SVG template, rasterised with resvg (no scripts, no network).
// Every piece of GitHub data goes through esc() before it enters the SVG.
import { Resvg } from '@resvg/resvg-wasm';
import { buildBiodata, matchKundli, type Band, type Biodata } from '../biodata';
import { fetchProfile, parseUsername, safeUrl } from '../github';
import { CACHE_OK, esc } from './share';

const CACHE_ERR = 'public, max-age=0, s-maxage=600';
const AVATAR_HOST = 'avatars.githubusercontent.com';
const MAX_AVATAR = 1_000_000;

export interface Deps { fonts: () => Promise<Uint8Array[]>; ready: () => Promise<void>; token?: string }

const C = { maroon: '#7a1f2b', gold: '#c9a227', cream: '#fff8ec', ink: '#2b1a12', muted: '#7c5c4a', marigold: '#f59e0b', orange: '#ea580c' };
const BAND: Record<Band, string> = { great: '#15803d', ok: '#b8860b', bad: '#b42318' };
const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

/** Splits text into at most `lines` lines of about `width` characters. */
export function wrap(s: string, width: number, lines = 2): string[] {
  const out: string[] = [];
  let cur = '';
  for (const w of s.split(/\s+/)) {
    if (cur && `${cur} ${w}`.length > width) { out.push(cur); cur = w; } else cur = cur ? `${cur} ${w}` : w;
  }
  if (cur) out.push(cur);
  return out.length > lines ? [...out.slice(0, lines - 1), cut(out.slice(lines - 1).join(' '), width)] : out;
}

/** Fetches a GitHub avatar as a data URL. Any other host, type or size is refused. */
export async function fetchAvatar(raw: string | null): Promise<string | null> {
  const url = safeUrl(raw, AVATAR_HOST);
  if (!url) return null;
  try {
    const u = new URL(url);
    u.searchParams.set('s', '260');
    const r = await fetch(u, { redirect: 'error', signal: AbortSignal.timeout(5_000) });
    const type = (r.headers.get('content-type') ?? '').split(';')[0]!.trim();
    if (!r.ok || !/^image\/(png|jpeg)$/.test(type)) return null;
    if (Number(r.headers.get('content-length') ?? 0) > MAX_AVATAR) return null;
    const buf = await r.arrayBuffer();
    if (buf.byteLength > MAX_AVATAR) return null;
    let bin = '';
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return `data:${type};base64,${btoa(bin)}`;
  } catch { return null; }
}

// --- SVG pieces. `t()` is the only way text gets in, and it always escapes.
type A = Record<string, string | number>;
const attrs = (a: A) => Object.entries(a).map(([k, v]) => `${k}="${esc(String(v))}"`).join(' ');
const t = (text: string, a: A) => `<text ${attrs(a)}>${esc(text)}</text>`;
const BODY = { 'font-family': 'Mukta', fill: C.ink };
const BOLD = { 'font-family': 'Mukta SemiBold', fill: C.ink };
const DISPLAY = { 'font-family': 'Yatra One', fill: C.maroon };

const garland = (y: number) => Array.from({ length: 27 }, (_, i) =>
  `<circle cx="${22 + i * 44.3}" cy="${y}" r="12" fill="${C.marigold}" stroke="${C.orange}" stroke-width="2"/><circle cx="${22 + i * 44.3}" cy="${y}" r="5" fill="#fde68a"/>`).join('');

const frame = (inner: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="${C.maroon}"/><rect x="14" y="14" width="1172" height="602" fill="${C.cream}"/>
${garland(38)}<rect x="14" y="58" width="1172" height="3" fill="${C.gold}"/>
${garland(592)}<rect x="14" y="569" width="1172" height="3" fill="${C.gold}"/>
${inner}</svg>`;

let clipId = 0;
function face(src: string | null, cx: number, cy: number, r: number): string {
  const id = `c${++clipId}`;
  const ring = `<circle cx="${cx}" cy="${cy}" r="${r + 5}" fill="none" stroke="${C.marigold}" stroke-width="10"/><circle cx="${cx}" cy="${cy}" r="${r + 12}" fill="none" stroke="${C.gold}" stroke-width="4"/>`;
  if (!src) return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#f6e7c8"/>${t('?', { ...DISPLAY, x: cx, y: cy + r / 3, 'font-size': r, 'text-anchor': 'middle' })}${ring}`;
  return `<clipPath id="${id}"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath>
<image href="${esc(src)}" x="${cx - r}" y="${cy - r}" width="${r * 2}" height="${r * 2}" clip-path="url(#${id})" preserveAspectRatio="xMidYMid slice"/>${ring}`;
}

const mark = (x: number, anchor: string) => t('gitrishta · make yours', { ...BODY, fill: C.muted, x, y: 545, 'font-size': 24, 'text-anchor': anchor });

export function biodataSvg(b: Biodata, avatar: string | null): string {
  const row = (k: string) => b.sections.flatMap((s) => s.rows).find((r) => r[0] === k)?.[1] ?? '';
  const pkg = (row('Package').match(/^.*? per annum/)?.[0] ?? '').replace('⭐', 'stars');
  const fields: [string, string][] = [['Gotra', row('Gotra')], ['Manglik', row('Manglik')], ['Package', pkg]];
  return frame(`${face(avatar, 205, 220, 112)}
${t(cut(b.name, 20), { ...DISPLAY, x: 205, y: 395, 'font-size': 40, 'text-anchor': 'middle' })}
${t(`@${cut(b.login, 24)}`, { ...BODY, fill: C.muted, x: 205, y: 432, 'font-size': 26, 'text-anchor': 'middle' })}
${t('SHUBH VIVAH · BIODATA', { ...BOLD, fill: C.gold, x: 400, y: 112, 'font-size': 24, 'letter-spacing': 6 })}
<text x="400" y="238" font-family="Yatra One" fill="${C.maroon}" font-size="124">${esc(String(b.gunas))}<tspan font-size="44" fill="${C.muted}" dx="10">/36 gunas</tspan></text>
${wrap(b.verdict, 44).map((l, i) => t(l, { ...BOLD, x: 400, y: 292 + i * 38, 'font-size': 30 })).join('')}
${fields.map(([k, v], i) => t(k, { ...BOLD, fill: C.maroon, x: 400, y: 392 + i * 44, 'font-size': 28 }) + t(cut(v, 40), { ...BODY, x: 550, y: 392 + i * 44, 'font-size': 28 })).join('')}
${mark(1150, 'end')}`);
}

export function kundliSvg(a: Biodata, b: Biodata, av: [string | null, string | null], score: number, title: string, verdict: string, band: Band): string {
  const who = (x: Biodata, src: string | null, cx: number) => `${face(src, cx, 245, 92)}
${t(cut(x.name, 16), { ...DISPLAY, x: cx, y: 390, 'font-size': 32, 'text-anchor': 'middle' })}
${t(`@${cut(x.login, 20)}`, { ...BODY, fill: C.muted, x: cx, y: 424, 'font-size': 24, 'text-anchor': 'middle' })}`;
  return frame(`${t('KUNDLI MILAN', { ...BOLD, fill: C.gold, x: 600, y: 112, 'font-size': 24, 'letter-spacing': 6, 'text-anchor': 'middle' })}
${who(a, av[0], 250)}${who(b, av[1], 950)}
<text x="600" y="282" text-anchor="middle" font-family="Yatra One" fill="${C.maroon}" font-size="130">${esc(String(score))}<tspan font-size="40" fill="${C.muted}">/36</tspan></text>
${t(title, { ...DISPLAY, fill: BAND[band], x: 600, y: 345, 'font-size': 40, 'text-anchor': 'middle' })}
${wrap(verdict, 56).map((l, i) => t(l, { ...BOLD, x: 600, y: 480 + i * 36, 'font-size': 28, 'text-anchor': 'middle' })).join('')}
${mark(600, 'middle')}`);
}

export const brandSvg = () => frame(`${t('SHUBH VIVAH', { ...BOLD, fill: C.gold, x: 600, y: 220, 'font-size': 24, 'letter-spacing': 6, 'text-anchor': 'middle' })}
${t('GitRishta', { ...DISPLAY, x: 600, y: 360, 'font-size': 130, 'text-anchor': 'middle' })}
${t('Your GitHub profile, as a shaadi biodata', { ...BODY, x: 600, y: 430, 'font-size': 34, 'text-anchor': 'middle' })}`);

export async function handleOg(req: Request, deps: Deps): Promise<Response> {
  const q = new URL(req.url).searchParams;
  const u = parseUsername(q.get('u')), mRaw = q.get('m'), m = mRaw === null ? undefined : parseUsername(mRaw);
  if (!u || m === null) return new Response('Invalid username', { status: 400, headers: { 'Cache-Control': CACHE_ERR } });

  const [fontBuffers] = await Promise.all([deps.fonts(), deps.ready()]);
  const png = (svg: string, cache: string) => {
    const r = new Resvg(svg, { font: { fontBuffers, defaultFontFamily: 'Mukta', loadSystemFonts: false } });
    const body = new Uint8Array(r.render().asPng());
    r.free();
    return new Response(body, { headers: { 'Content-Type': 'image/png', 'Cache-Control': cache, 'X-Content-Type-Options': 'nosniff' } });
  };
  try {
    const pa = await fetchProfile(u, deps.token);
    const pb = m ? await fetchProfile(m, deps.token) : null;
    const ba = buildBiodata(pa);
    if (!pb) return png(biodataSvg(ba, await fetchAvatar(ba.avatar)), CACHE_OK);
    const bb = buildBiodata(pb), k = matchKundli(pa, pb);
    const av = await Promise.all([fetchAvatar(ba.avatar), fetchAvatar(bb.avatar)]) as [string | null, string | null];
    return png(kundliSvg(ba, bb, av, k.score, k.title, k.verdict, k.band), CACHE_OK);
  } catch {
    return png(brandSvg(), CACHE_ERR);
  }
}
