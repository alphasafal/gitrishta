// Trusted Types default policy. The CSP blocks every HTML and script sink;
// the one script this app loads at runtime is Vercel's same-origin analytics.
export const ANALYTICS_SRC = '/_vercel/insights/script.js';

type TT = { createPolicy: (n: string, p: object) => unknown; defaultPolicy: unknown };

export function installPolicy(w: Window & { trustedTypes?: TT } = window): void {
  if (!w.trustedTypes || w.trustedTypes.defaultPolicy) return;
  w.trustedTypes.createPolicy('default', {
    createScriptURL(url: string) {
      if (new URL(url, w.location.href).href === new URL(ANALYTICS_SRC, w.location.href).href) return url;
      throw new TypeError('Blocked by Trusted Types');
    },
  });
}
