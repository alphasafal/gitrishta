import '@fontsource/yatra-one/400.css';
import '@fontsource/mukta/400.css';
import '@fontsource/mukta/600.css';
import './style.css';
import { buildBiodata, matchKundli } from './biodata';
import { fetchProfile, GhError, parseUsername } from './github';
import { renderBiodata, renderMatch, THEMES, type Opts, type Theme } from './render';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const form = $('form') as HTMLFormElement, u1 = $<HTMLInputElement>('u1'), u2 = $<HTMLInputElement>('u2');
const out = $('out'), status = $('status'), actions = $('actions');
const site = (location.host + location.pathname).replace(/\/(index\.html)?$/, '') || 'gitrishta';
let mode: 'single' | 'match' = 'single', run = 0, shareText = '';
let last: (() => HTMLElement) | null = null;
const qs0 = new URLSearchParams(location.search);
const opts: Opts = {
  site, hindi: qs0.get('l') === 'hi',
  theme: (THEMES as readonly string[]).includes(qs0.get('t') ?? '') ? (qs0.get('t') as Theme) : 'north',
};

const LOADING = ['Pandit ji is reading your commits…', 'Checking your kundli against main…', 'Asking Sharma aunty about your PRs…', 'Counting stars (the GitHub kind)…'];

function setMode(m: typeof mode) {
  mode = m;
  document.body.classList.toggle('match', m === 'match');
  document.querySelectorAll<HTMLButtonElement>('.tab').forEach((t) => {
    const on = t.dataset.mode === m;
    t.classList.toggle('active', on);
    t.setAttribute('aria-selected', String(on));
  });
  form.querySelector('.go')!.textContent = m === 'match' ? 'Milao Kundli' : 'Banao Biodata';
  u2.required = m === 'match';
}

const errorText = (e: unknown, who: string) => {
  const k = e instanceof GhError ? e.kind : 'network';
  if (k === 'invalid') return 'That does not look like a GitHub username. Letters, numbers and single hyphens only.';
  if (k === 'notfound') return `No rishta found for @${who}. Shayad private type ke hain.`;
  if (k === 'ratelimit') {
    const t = (e as GhError).reset?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `Pandit ji needs a break. GitHub allows 60 lookups an hour per visitor${t ? `; try again after ${t}` : ''}.`;
  }
  return 'Could not reach GitHub. Check your internet and try again.';
};

async function go(a: string, b?: string) {
  const id = ++run;
  const la = parseUsername(a), lb = b === undefined ? undefined : parseUsername(b);
  if (!la || lb === null) { status.textContent = errorText(new GhError('invalid'), ''); return; }
  let i = 0;
  status.textContent = LOADING[0]!;
  const tick = setInterval(() => { status.textContent = LOADING[++i % LOADING.length]!; }, 1400);
  out.replaceChildren(); actions.hidden = true; last = null;
  try {
    const pa = await fetchProfile(la).catch((e) => { throw [e, la]; });
    const pb = lb ? await fetchProfile(lb).catch((e) => { throw [e, lb]; }) : null;
    if (id !== run) return;
    const ba = buildBiodata(pa);
    if (pb) {
      const bb = buildBiodata(pb), m = matchKundli(pa, pb);
      last = () => renderMatch(ba, bb, m, opts);
      shareText = `@${ba.login} × @${bb.login}: ${m.score}/36 gunas matched on GitRishta. ${m.verdict}`;
    } else {
      last = () => renderBiodata(ba, opts);
      shareText = `My GitHub shaadi biodata: ${ba.gunas}/36 gunas. ${ba.sections[0]!.rows.find((r) => r[0] === 'Manglik')![1]}. Make yours:`;
    }
    status.textContent = '';
    paint(pa.user.login, pb?.user.login);
    const url = location.href;
    ($('x') as HTMLAnchorElement).href = `https://x.com/intent/post?${new URLSearchParams({ text: shareText, url })}`;
    ($('li') as HTMLAnchorElement).href = `https://www.linkedin.com/sharing/share-offsite/?${new URLSearchParams({ url })}`;
    actions.hidden = false;
    out.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (err) {
    if (id !== run) return;
    const [e, who] = Array.isArray(err) ? err : [err, la];
    status.textContent = errorText(e, who);
  } finally { clearInterval(tick); }
}

function paint(u = qs().get('u'), m = qs().get('m')) {
  if (!last || !u) return;
  out.replaceChildren(last());
  const q = new URLSearchParams({ u, ...(m && { m }), ...(opts.theme !== 'north' && { t: opts.theme }), ...(opts.hindi && { l: 'hi' }) });
  history.replaceState(null, '', `?${q}`);
  document.querySelectorAll<HTMLButtonElement>('[data-theme]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.theme === opts.theme)));
  $('lang').setAttribute('aria-pressed', String(opts.hindi));
}
const qs = () => new URLSearchParams(location.search);

async function toPng(): Promise<Blob | null> {
  const card = document.getElementById('card');
  if (!card) return null;
  const { toBlob } = await import('html-to-image');
  return toBlob(card, { pixelRatio: 2, backgroundColor: '#fff8ec', cacheBust: false,
    imagePlaceholder: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=',
    style: { boxShadow: 'none', margin: '0', animation: 'none' } });
}
const fileName = () => `gitrishta-${new URLSearchParams(location.search).get('u') ?? 'biodata'}.png`;

form.addEventListener('submit', (e) => { e.preventDefault(); void go(u1.value, mode === 'match' ? u2.value : undefined); });
document.querySelectorAll<HTMLButtonElement>('.tab').forEach((t) => t.addEventListener('click', () => setMode(t.dataset.mode as typeof mode)));
document.querySelectorAll<HTMLButtonElement>('.chip').forEach((c) => c.addEventListener('click', () => {
  const v = c.dataset.u!;
  if (mode === 'match' && u1.value && !u2.value) u2.value = v; else u1.value = v;
  if (mode === 'single' || (u1.value && u2.value)) form.requestSubmit();
}));
document.querySelectorAll<HTMLButtonElement>('button[data-theme]').forEach((b) => b.addEventListener('click', () => {
  opts.theme = b.dataset.theme as Theme; paint();
}));
$('lang').addEventListener('click', () => { opts.hindi = !opts.hindi; paint(); });
$('pdf').addEventListener('click', () => window.print());
$('png').addEventListener('click', async () => {
  const blob = await toPng().catch(() => null);
  if (!blob) { status.textContent = 'Could not make the image. Try Print / Save PDF instead.'; return; }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = fileName(); a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
});
$('share').addEventListener('click', async () => {
  const blob = await toPng().catch(() => null);
  const file = blob && new File([blob], fileName(), { type: 'image/png' });
  const data: ShareData = { title: 'GitRishta', text: shareText, url: location.href, ...(file && { files: [file] }) };
  try {
    if (navigator.canShare?.(data)) await navigator.share(data);
    else { await navigator.clipboard.writeText(`${shareText} ${location.href}`); status.textContent = 'Link copied. Ab family group mein bhejo.'; }
  } catch { /* user closed the share sheet */ }
});

const qu = qs0.get('u'), qm = qs0.get('m');
if (qm !== null) setMode('match');
if (qu) { u1.value = qu.slice(0, 120); if (qm) u2.value = qm.slice(0, 120); void go(qu, qm ?? undefined); }
