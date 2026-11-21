import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  build: { target: 'es2022', assetsInlineLimit: 0, sourcemap: false },
  // The CSP blocks Vite's inline HMR client, so it is only enforced in builds.
  plugins: [{ name: 'dev-csp', apply: 'serve', transformIndexHtml: (html) => html.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/, '') }],
  test: { environment: 'jsdom', include: ['test/**/*.test.ts'] },
});
