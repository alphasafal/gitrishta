// /api/og: the 1200x630 link-preview image for a biodata or a kundli match.
import { ImageResponse } from '@vercel/og';
import { buildBiodata, matchKundli, type Biodata } from '../biodata';
import { fetchProfile, parseUsername, safeUrl } from '../github';
import { CACHE_OK } from './share';

const CACHE_ERR = 'public, max-age=0, s-maxage=600';
const AVATAR_HOST = 'avatars.githubusercontent.com';
const MAX_AVATAR = 1_000_000;

export interface Font { name: string; data: ArrayBuffer; weight: 400 | 600; style: 'normal' }
export interface Deps { fonts: () => Promise<Font[]>; token?: string }

type Node = { type: string; props: Record<string, unknown> } | string;
const e = (type: string, style: Record<string, unknown>, ...children: Node[]): Node =>
  ({ type, props: { style: { display: 'flex', ...style }, children } });
const img = (src: string, size: number, style: Record<string, unknown> = {}): Node =>
  ({ type: 'img', props: { src, width: size, height: size, style: { borderRadius: '50%', ...style } } });
const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

const C = { maroon: '#7a1f2b', gold: '#c9a227', cream: '#fff8ec', ink: '#2b1a12', muted: '#7c5c4a', marigold: '#f59e0b' };
const BAND = { great: '#15803d', ok: '#b8860b', bad: '#b42318' };

/** Fetches a GitHub avatar as a data URL. Any other host, type or size is refused. */
export async function fetchAvatar(raw: string | null): Promise<string | null> {
  const url = safeUrl(raw, AVATAR_HOST);
  if (!url) return null;
  try {
    const u = new URL(url);
    u.searchParams.set('s', '260');
    const r = await fetch(u, { redirect: 'error', signal: AbortSignal.timeout(5_000) });
    const type = r.headers.get('content-type') ?? '';
    if (!r.ok || !/^image\/(png|jpeg|gif|webp)$/.test(type.split(';')[0]!.trim())) return null;
    if (Number(r.headers.get('content-length') ?? 0) > MAX_AVATAR) return null;
    const buf = await r.arrayBuffer();
    if (buf.byteLength > MAX_AVATAR) return null;
    let bin = '';
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return `data:${type.split(';')[0]};base64,${btoa(bin)}`;
  } catch { return null; }
}

const garland = (edge: 'borderBottom' | 'borderTop') => e('div', {
  height: 36, alignItems: 'center', justifyContent: 'space-around', padding: '0 8px', [edge]: `3px solid ${C.gold}`,
}, ...Array.from({ length: 26 }, () => e('div', {
  width: 22, height: 22, borderRadius: '50%', background: '#fde68a', border: `6px solid ${C.marigold}`, boxShadow: '0 0 0 2px #ea580c',
})));

const frame = (...kids: Node[]) => e('div', {
  width: '100%', height: '100%', flexDirection: 'column', background: C.cream, fontFamily: 'Mukta',
  border: `14px solid ${C.maroon}`, color: C.ink,
}, garland('borderBottom'), e('div', { flex: 1, padding: '24px 56px 14px', flexDirection: 'column' }, ...kids), garland('borderTop'));

const face = (src: string | null, size: number) => src
  ? img(src, size, { border: `8px solid ${C.marigold}`, boxShadow: `0 0 0 4px ${C.gold}` })
  : e('div', { width: size, height: size, borderRadius: '50%', background: '#f6e7c8', border: `8px solid ${C.marigold}`, alignItems: 'center', justifyContent: 'center', fontSize: size / 3, color: C.maroon, fontFamily: 'Yatra One' }, '?');

const kicker = (text: string) => e('div', { fontSize: 24, letterSpacing: 6, color: C.gold, fontWeight: 600 }, text);
const mark = e('div', { marginTop: 'auto', justifyContent: 'flex-end', fontSize: 24, color: C.muted }, 'gitrishta · make yours');

function biodataCard(b: Biodata, avatar: string | null): Node {
  const row = (k: string) => b.sections.flatMap((s) => s.rows).find((r) => r[0] === k)?.[1] ?? '';
  const line = (k: string, v: string) => e('div', { fontSize: 28, marginTop: 6 },
    e('div', { color: C.maroon, fontWeight: 600, width: 150 }, k), e('div', { flex: 1 }, cut(v, 48)));
  return frame(e('div', { flex: 1 },
    e('div', { width: 330, flexDirection: 'column', alignItems: 'center', paddingTop: 8 },
      face(avatar, 230),
      e('div', { fontFamily: 'Yatra One', fontSize: 40, color: C.maroon, marginTop: 18, textAlign: 'center' }, cut(b.name, 20)),
      e('div', { fontSize: 26, color: C.muted }, `@${cut(b.login, 24)}`)),
    e('div', { flex: 1, flexDirection: 'column', marginLeft: 48 },
      kicker('SHUBH VIVAH · BIODATA'),
      e('div', { alignItems: 'flex-end', marginTop: 4 },
        e('div', { fontFamily: 'Yatra One', fontSize: 124, color: C.maroon, lineHeight: 1 }, String(b.gunas)),
        e('div', { fontFamily: 'Yatra One', fontSize: 44, color: C.muted, marginLeft: 8, marginBottom: 14 }, '/36 gunas')),
      e('div', { fontSize: 30, fontWeight: 600, marginBottom: 12 }, cut(b.verdict, 60)),
      line('Gotra', row('Gotra')), line('Manglik', row('Manglik')), line('Package', (row('Package').match(/^.*? per annum/)?.[0] ?? '').replace('⭐', 'stars')),
      mark)));
}

function kundliCard(a: Biodata, b: Biodata, av: [string | null, string | null], score: number, title: string, verdict: string, band: keyof typeof BAND): Node {
  const who = (x: Biodata, src: string | null) => e('div', { width: 300, flexDirection: 'column', alignItems: 'center' },
    face(src, 190),
    e('div', { fontFamily: 'Yatra One', fontSize: 32, color: C.maroon, marginTop: 14, whiteSpace: 'nowrap' }, cut(x.name, 16)),
    e('div', { fontSize: 24, color: C.muted }, `@${cut(x.login, 20)}`));
  return frame(e('div', { flexDirection: 'column', flex: 1, alignItems: 'center' },
    kicker('KUNDLI MILAN'),
    e('div', { alignItems: 'flex-start', marginTop: 10 },
      who(a, av[0]),
      e('div', { width: 300, flexDirection: 'column', alignItems: 'center', paddingTop: 24 },
        e('div', { alignItems: 'flex-end' },
          e('div', { fontFamily: 'Yatra One', fontSize: 130, color: C.maroon, lineHeight: 1 }, String(score)),
          e('div', { fontFamily: 'Yatra One', fontSize: 40, color: C.muted, marginBottom: 16 }, '/36')),
        e('div', { fontFamily: 'Yatra One', fontSize: 40, color: BAND[band] }, title)),
      who(b, av[1])),
    e('div', { fontSize: 28, fontWeight: 600, marginTop: 14 }, cut(verdict, 70)),
    mark));
}

const brandCard = () => frame(e('div', { flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  kicker('SHUBH VIVAH'),
  e('div', { fontFamily: 'Yatra One', fontSize: 130, color: C.maroon }, 'GitRishta'),
  e('div', { fontSize: 34 }, 'Your GitHub profile, as a shaadi biodata')));

export async function handleOg(req: Request, deps: Deps): Promise<Response> {
  const q = new URL(req.url).searchParams;
  const u = parseUsername(q.get('u')), mRaw = q.get('m'), m = mRaw === null ? undefined : parseUsername(mRaw);
  if (!u || m === null) return new Response('Invalid username', { status: 400, headers: { 'Cache-Control': CACHE_ERR } });

  const fonts = await deps.fonts();
  const draw = (node: Node, cache: string) => new ImageResponse(node as never, {
    width: 1200, height: 630, fonts, headers: { 'Cache-Control': cache, 'X-Content-Type-Options': 'nosniff' },
  });
  try {
    const pa = await fetchProfile(u, deps.token);
    const pb = m ? await fetchProfile(m, deps.token) : null;
    const ba = buildBiodata(pa);
    if (!pb) return draw(biodataCard(ba, await fetchAvatar(ba.avatar)), CACHE_OK);
    const bb = buildBiodata(pb), k = matchKundli(pa, pb);
    const av = await Promise.all([fetchAvatar(ba.avatar), fetchAvatar(bb.avatar)]) as [string | null, string | null];
    return draw(kundliCard(ba, bb, av, k.score, k.title, k.verdict, k.band), CACHE_OK);
  } catch {
    return draw(brandCard(), CACHE_ERR);
  }
}
