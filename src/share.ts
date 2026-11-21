import type { Biodata, Match } from './biodata';

const row = (b: Biodata, k: string) => b.sections.flatMap((s) => s.rows).find((r) => r[0] === k)?.[1];

/** A plain-text biodata for WhatsApp family groups (WhatsApp renders *bold*). */
export function biodataText(b: Biodata, url: string): string {
  const line = (icon: string, k: string) => { const v = row(b, k); return v ? `${icon} ${k}: ${v}` : null; };
  return [
    `💍 *GitHub Biodata: ${b.name}* (@${b.login})`,
    `✨ *${b.gunas}/36 gunas*: ${b.verdict}`, '',
    line('🪷', 'Gotra'), line('🔮', 'Rashi'), line('🌙', 'Nakshatra'), line('🔥', 'Manglik'),
    line('💼', 'Package'), line('🏠', 'Family'),
    `🙏 Seeking: ${b.expectations[0]}`, '',
    `Make yours: ${url}`,
  ].filter((l) => l !== null).join('\n');
}

export function matchText(a: Biodata, b: Biodata, m: Match, url: string): string {
  return [
    `💞 *Kundli Milan: @${a.login} × @${b.login}*`,
    `✨ *${m.score}/36 gunas*, ${m.title}. ${m.verdict}`, '',
    ...m.kootas.map((k) => `${k.icon} ${k.name}: ${k.score}/${k.max}`), '',
    `🪔 Pandit ji: ${m.advice}`, '',
    `Match yours: ${url}`,
  ].join('\n');
}

/** Markdown badge for a GitHub profile README. */
export function badgeMarkdown(b: Biodata, url: string): string {
  const img = `https://img.shields.io/static/v1?${new URLSearchParams({ label: 'GitRishta', message: `${b.gunas}/36 gunas`, color: '7a1f2b', logo: 'github' })}`;
  return `[![GitRishta: ${b.gunas}/36 gunas](${img})](${url})`;
}
