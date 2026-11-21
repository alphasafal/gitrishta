import type { Biodata, Match } from './biodata';
import { h } from './dom';

const avatar = (b: Biodata, cls = 'avatar') =>
  b.avatar
    ? h('img', { class: cls, src: `${b.avatar}${b.avatar.includes('?') ? '&' : '?'}s=240`, alt: `${b.name}'s photo`, width: '120', height: '120', crossorigin: 'anonymous', referrerpolicy: 'no-referrer' })
    : h('div', { class: `${cls} avatar-empty`, role: 'img', 'aria-label': 'No photo' }, '🙈');

const toran = () => h('div', { class: 'toran', 'aria-hidden': 'true' });

export function renderBiodata(b: Biodata, site: string): HTMLElement {
  return h('article', { class: 'biodata', id: 'card' },
    toran(),
    h('header', { class: 'bd-head' },
      h('p', { class: 'invocation' }, '॥ शुभ विवाह ॥'),
      h('h2', { class: 'bd-title' }, 'Biodata'),
      h('p', { class: 'bd-sub' }, `github.com/${b.login}`)),
    h('div', { class: 'bd-top' },
      avatar(b),
      h('div', { class: 'gunas' },
        h('p', { class: 'gunas-num' }, String(b.gunas), h('span', {}, '/36')),
        h('p', { class: 'gunas-label' }, 'gunas matched'),
        h('p', { class: 'gunas-verdict' }, b.verdict))),
    b.bio && h('blockquote', { class: 'bd-bio' }, `“${b.bio}”`),
    ...b.sections.map((s) => h('section', { class: 'bd-sec' },
      h('h3', {}, h('span', { class: 'hi' }, s.hindi), s.title),
      h('dl', {}, ...s.rows.flatMap(([k, v]) => [h('dt', {}, k), h('dd', {}, v)])))),
    h('section', { class: 'bd-sec' },
      h('h3', {}, h('span', { class: 'hi' }, 'अपेक्षाएँ'), 'Seeking'),
      h('ul', { class: 'bd-exp' }, ...b.expectations.map((e) => h('li', {}, e)))),
    h('footer', { class: 'bd-foot' },
      h('p', {}, 'Contact: Mama ji · ', h('a', { href: b.profileUrl, target: '_blank', rel: 'noopener noreferrer' }, `github.com/${b.login}`)),
      h('p', { class: 'bd-mark' }, `Make yours at ${site}`)),
    toran());
}

export function renderMatch(a: Biodata, b: Biodata, m: Match, site: string): HTMLElement {
  const side = (x: Biodata) => h('div', { class: 'km-side' }, avatar(x, 'avatar small'), h('p', { class: 'km-name' }, x.name), h('p', { class: 'km-login' }, `@${x.login}`));
  return h('article', { class: 'biodata kundli', id: 'card' },
    toran(),
    h('header', { class: 'bd-head' },
      h('p', { class: 'invocation' }, '॥ कुंडली मिलान ॥'),
      h('h2', { class: 'bd-title' }, 'Kundli Milan')),
    h('div', { class: 'km-pair' }, side(a), h('div', { class: 'km-heart', 'aria-hidden': 'true' }, '💞'), side(b)),
    h('div', { class: 'gunas center' },
      h('p', { class: 'gunas-num' }, String(m.score), h('span', {}, '/36')),
      h('p', { class: 'gunas-label' }, 'gunas matched'),
      h('p', { class: 'gunas-verdict' }, m.verdict)),
    h('section', { class: 'bd-sec' },
      h('h3', {}, h('span', { class: 'hi' }, 'गुण मिलान'), 'Breakdown'),
      h('dl', {}, ...m.parts.flatMap(([k, v]) => [h('dt', {}, k), h('dd', {}, v)]))),
    h('footer', { class: 'bd-foot' }, h('p', { class: 'bd-mark' }, `Match yours at ${site}`)),
    toran());
}
