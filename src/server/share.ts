// /s/<user> and /s/<user>/<match>: a tiny page that gives link previews
// (X, LinkedIn, WhatsApp) a per-user image, then sends people to the app.
// It never calls GitHub, so it is cheap and cannot be used to burn quota.
import { parseUsername } from '../github';

export const CACHE_OK = 'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800';
const THEMES = new Set(['north', 'south', 'bengali', 'punjabi']);

export const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Our own public origin. Only a clean scheme://host[:port] is accepted. */
export function siteOrigin(reqUrl: string, configured?: string): string {
  const ok = (o?: string) => (o && /^https?:\/\/[a-z\d.-]+(:\d{1,5})?$/i.test(o) ? o : null);
  return ok(configured?.replace(/\/+$/, '')) ?? ok(new URL(reqUrl).origin) ?? 'https://gitrishta.vercel.app';
}

export function handleShare(req: Request, configuredOrigin?: string): Response {
  const url = new URL(req.url), q = url.searchParams;
  const u = parseUsername(q.get('u')), mRaw = q.get('m'), m = mRaw === null ? undefined : parseUsername(mRaw);
  if (!u || m === null) return new Response(null, { status: 302, headers: { Location: '/', 'Cache-Control': CACHE_OK } });

  const t = q.get('t'), app = `/?${new URLSearchParams({
    u, ...(m && { m }), ...(t && THEMES.has(t) && t !== 'north' && { t }), ...(q.get('l') === 'hi' && { l: 'hi' }),
  })}`;
  const base = siteOrigin(req.url, configuredOrigin);
  const img = `${base}/api/og?${new URLSearchParams({ u, ...(m && { m }) })}`;
  const title = m ? `@${u} × @${m}: Kundli Milan · GitRishta` : `@${u}'s GitHub shaadi biodata · GitRishta`;
  const desc = m
    ? 'How many of 36 gunas match? Languages, commit hours, licenses and stars, compared.'
    : 'Gotra, rashi, manglik status and package (in stars), straight from their GitHub.';

  const meta = (k: string, v: string, attr = 'property') => `<meta ${attr}="${k}" content="${esc(v)}">`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>${esc(title)}</title>
${meta('description', desc, 'name')}
${meta('og:type', 'website')}${meta('og:site_name', 'GitRishta')}
${meta('og:title', title)}${meta('og:description', desc)}
${meta('og:url', base + url.pathname)}
${meta('og:image', img)}${meta('og:image:width', '1200')}${meta('og:image:height', '630')}
${meta('og:image:alt', title)}
${meta('twitter:card', 'summary_large_image', 'name')}
<meta http-equiv="refresh" content="0;url=${esc(app)}">
<link rel="canonical" href="${esc(base + app)}">
</head><body><p><a href="${esc(app)}">Open on GitRishta</a></p></body></html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': CACHE_OK,
      'Content-Security-Policy': "default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
      'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
  });
}
