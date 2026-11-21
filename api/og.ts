import { initWasm } from '@resvg/resvg-wasm';
// @ts-expect-error Vercel's Edge bundler imports .wasm?module as a WebAssembly.Module
import resvgWasm from '@resvg/resvg-wasm/index_bg.wasm?module';
import { handleOg } from '../src/server/og';

export const config = { runtime: 'edge' };

let ready: Promise<void> | undefined;
let fonts: Promise<Uint8Array[]> | undefined;
const bytes = (url: URL) => fetch(url).then((r) => r.arrayBuffer()).then((b) => new Uint8Array(b));
const loadFonts = () => (fonts ??= Promise.all([
  bytes(new URL('../assets/fonts/yatra-one-latin-400-normal.ttf', import.meta.url)),
  bytes(new URL('../assets/fonts/mukta-latin-400-normal.ttf', import.meta.url)),
  bytes(new URL('../assets/fonts/mukta-latin-600-normal.ttf', import.meta.url)),
]));

// GITHUB_TOKEN is optional: a fine-grained token with no permissions, set in the Vercel dashboard.
export default (req: Request) => handleOg(req, {
  fonts: loadFonts,
  ready: () => (ready ??= initWasm(resvgWasm as WebAssembly.Module)),
  token: process.env.GITHUB_TOKEN || undefined,
});
