import { handleOg, type Font } from '../src/server/og';

export const config = { runtime: 'edge' };

const load = (f: string) => fetch(new URL(`../assets/fonts/${f}`, import.meta.url)).then((r) => r.arrayBuffer());
let fonts: Promise<Font[]> | undefined;
const loadFonts = () => (fonts ??= Promise.all([
  load('yatra-one-latin-400-normal.woff').then((data): Font => ({ name: 'Yatra One', data, weight: 400, style: 'normal' })),
  load('mukta-latin-400-normal.woff').then((data): Font => ({ name: 'Mukta', data, weight: 400, style: 'normal' })),
  load('mukta-latin-600-normal.woff').then((data): Font => ({ name: 'Mukta', data, weight: 600, style: 'normal' })),
]));

// GITHUB_TOKEN is optional: a fine-grained token with no permissions, set in the Vercel dashboard.
export default (req: Request) => handleOg(req, { fonts: loadFonts, token: process.env.GITHUB_TOKEN || undefined });
