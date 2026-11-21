import type { Biodata, Match, Side } from './biodata';
import { h, vars } from './dom';

const avatar = (b: Biodata, cls = 'avatar') =>
  b.avatar
    ? h('img', { class: cls, src: `${b.avatar}${b.avatar.includes('?') ? '&' : '?'}s=240`, alt: `${b.name}'s photo`, width: '120', height: '120', crossorigin: 'anonymous', referrerpolicy: 'no-referrer' })
    : h('div', { class: `${cls} avatar-empty`, role: 'img', 'aria-label': 'No photo' }, '🙈');

const toran = () => h('div', { class: 'toran', 'aria-hidden': 'true' });

export const THEMES = ['north', 'south', 'bengali', 'punjabi'] as const;
export type Theme = (typeof THEMES)[number];
export interface Opts { site: string; theme: Theme; hindi: boolean }

const HI: Record<string, string> = {
  Name: 'नाम', 'Ghar ka naam': 'घर का नाम', 'Janm tithi': 'जन्म तिथि', 'Janm sthaan': 'जन्म स्थान',
  Height: 'कद', Gotra: 'गोत्र', Rashi: 'राशि', Nakshatra: 'नक्षत्र', Manglik: 'मांगलिक', Diet: 'आहार',
  Education: 'शिक्षा', Occupation: 'व्यवसाय', Package: 'पैकेज', 'Settled in': 'बसे हैं', Languages: 'भाषाएँ',
  Pitaji: 'पिताजी', Mataji: 'माताजी', 'Bhai-behen': 'भाई-बहन', Family: 'परिवार', Jaaydaad: 'जायदाद',
  'Family values': 'संस्कार', 'Late relatives': 'स्वर्गीय रिश्तेदार', Shauk: 'शौक़', Drinks: 'पेय', Smokes: 'धूम्रपान',
  Biodata: 'बायोडाटा', 'Kundli Milan': 'कुंडली मिलान', 'gunas matched': 'गुण मिले', 'of 36 gunas': '36 में से',
  'Bhasha Koota': 'भाषा कूट', 'Samay Koota': 'समय कूट', 'Sanskaar Koota': 'संस्कार कूट', 'Mehnat Koota': 'मेहनत कूट',
  'Shohrat Koota': 'शोहरत कूट', 'Uttam Milan': 'उत्तम मिलान', 'Madhyam Milan': 'मध्यम मिलान', 'Adhura Milan': 'अधूरा मिलान',
  Gotra_: 'गोत्र', Rashi_: 'राशि', Peak_: 'समय', 'Pandit ji ki salah': 'पंडित जी की सलाह',
};
const t = (o: Opts, en: string) => (o.hindi && HI[en]) || en.replace(/_$/, '');
const heading = (o: Opts, hindi: string, en: string) =>
  o.hindi ? h('h3', { class: 'is-hi' }, hindi, h('span', { class: 'hi' }, en)) : h('h3', {}, h('span', { class: 'hi' }, hindi), en);

export function renderBiodata(b: Biodata, o: Opts): HTMLElement {
  return h('article', { class: 'biodata', id: 'card', 'data-theme': o.theme },
    toran(),
    h('header', { class: 'bd-head' },
      h('p', { class: 'invocation' }, '॥ शुभ विवाह ॥'),
      h('h2', { class: 'bd-title' }, t(o, 'Biodata')),
      h('p', { class: 'bd-sub' }, `github.com/${b.login}`)),
    h('div', { class: 'bd-top' },
      avatar(b),
      h('div', { class: 'gunas' },
        h('p', { class: 'gunas-num' }, String(b.gunas), h('span', {}, '/36')),
        h('p', { class: 'gunas-label' }, t(o, 'gunas matched')),
        h('p', { class: 'gunas-verdict' }, b.verdict))),
    b.bio && h('blockquote', { class: 'bd-bio' }, `“${b.bio}”`),
    ...b.sections.map((s) => h('section', { class: 'bd-sec' },
      heading(o, s.hindi, s.title),
      h('dl', {}, ...s.rows.flatMap(([k, v]) => [h('dt', {}, t(o, k)), h('dd', {}, v)])))),
    h('section', { class: 'bd-sec' },
      heading(o, 'अपेक्षाएँ', 'Seeking'),
      h('ul', { class: 'bd-exp' }, ...b.expectations.map((e) => h('li', {}, e)))),
    h('footer', { class: 'bd-foot' },
      h('p', {}, 'Contact: Mama ji · ', h('a', { href: b.profileUrl, target: '_blank', rel: 'noopener noreferrer' }, `github.com/${b.login}`)),
      h('p', { class: 'bd-mark' }, `Make yours at ${o.site}`)),
    toran());
}

export function renderMatch(a: Biodata, b: Biodata, m: Match, o: Opts): HTMLElement {
  const person = (x: Biodata, s: Side) => h('div', { class: 'km-person' },
    avatar(x, 'avatar small'),
    h('p', { class: 'km-name' }, x.name),
    h('p', { class: 'km-login' }, `@${x.login}`),
    h('ul', { class: 'km-tags' },
      h('li', {}, h('b', {}, `${t(o, 'Gotra_')} `), s.lang), h('li', {}, h('b', {}, `${t(o, 'Rashi_')} `), s.rashi), h('li', {}, h('b', {}, `${t(o, 'Peak_')} `), s.hour)));
  const ring = vars(h('div', { class: 'km-ring', role: 'img', 'aria-label': `${m.score} out of 36 gunas matched` },
    h('div', { class: 'km-ring-in' },
      h('p', { class: 'km-score' }, String(m.score)),
      h('p', { class: 'km-of' }, t(o, 'of 36 gunas')))), { p: (m.score / 36).toFixed(3) });

  return h('article', { class: 'biodata kundli', id: 'card', 'data-band': m.band, 'data-theme': o.theme },
    toran(),
    h('header', { class: 'bd-head' },
      h('p', { class: 'invocation' }, '॥ कुंडली मिलान ॥'),
      h('h2', { class: 'bd-title' }, t(o, 'Kundli Milan'))),
    h('div', { class: 'km-hero' },
      person(a, m.sides[0]),
      h('div', { class: 'km-mid' }, h('div', { class: 'km-heart', 'aria-hidden': 'true' }, '💞'), ring),
      person(b, m.sides[1])),
    h('div', { class: 'km-verdict' }, h('p', { class: 'km-title' }, t(o, m.title)), h('p', { class: 'km-verdict-text' }, m.verdict)),
    h('section', { class: 'bd-sec' },
      heading(o, 'गुण मिलान', 'Guna Milan'),
      h('ol', { class: 'km-kootas' }, ...m.kootas.map((k) => h('li', { class: 'koota' },
        h('span', { class: 'k-icon', 'aria-hidden': 'true' }, k.icon),
        h('div', { class: 'k-body' },
          h('p', { class: 'k-head' }, h('strong', {}, t(o, k.name)), h('span', { class: 'k-sub' }, k.sub)),
          vars(h('div', { class: 'k-bar', 'aria-hidden': 'true' }, h('i', {})), { w: (k.score / k.max).toFixed(3) }),
          h('p', { class: 'k-note' }, k.note)),
        h('p', { class: 'k-score' }, String(k.score), h('small', {}, `/${k.max}`)))))),
    h('section', { class: 'bd-sec' },
      heading(o, 'समानताएँ', 'Common Ground'),
      h('ul', { class: 'km-chips' }, ...m.common.map((c) => h('li', {}, c)))),
    h('div', { class: 'km-advice' }, h('p', { class: 'km-advice-h' }, `🪔 ${t(o, 'Pandit ji ki salah')}`), h('p', {}, m.advice)),
    h('footer', { class: 'bd-foot' }, h('p', { class: 'bd-mark' }, `Match yours at ${o.site}`)),
    toran());
}
