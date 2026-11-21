// Tiny DOM builder. Strings always become text nodes, never HTML,
// and only allow-listed attributes can be set.
type Child = Node | string | null | undefined | false;
const ATTRS = new Set(['class', 'id', 'href', 'src', 'alt', 'target', 'rel', 'width', 'height', 'role', 'aria-label', 'aria-live', 'aria-hidden', 'loading', 'crossorigin', 'referrerpolicy', 'type', 'title', 'data-band', 'data-theme']);

export function h(tag: string, attrs: Record<string, string | null | undefined> = {}, ...kids: Child[]): HTMLElement {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null) continue;
    if (!ATTRS.has(k)) throw new Error(`attribute not allowed: ${k}`);
    if ((k === 'href' || k === 'src') && !/^(https:\/\/|\.\/|#|blob:)/.test(v)) continue;
    el.setAttribute(k, v);
  }
  for (const c of kids) if (c) el.append(typeof c === 'string' ? document.createTextNode(c) : c);
  return el;
}

/** Sets CSS custom properties through the CSSOM, which the CSP allows (unlike style="..."). */
export function vars<T extends HTMLElement>(el: T, props: Record<string, string | number>): T {
  for (const [k, v] of Object.entries(props)) el.style.setProperty(`--${k}`, String(v));
  return el;
}
