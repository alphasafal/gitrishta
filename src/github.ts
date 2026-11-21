// Talks to the public GitHub REST API straight from the visitor's browser.
// No token, no backend: every visitor gets GitHub's own 60 req/hour quota.
// Everything that comes back is untrusted and gets normalised here.

const API = 'https://api.github.com';
const USERNAME = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;

export interface User {
  login: string; name: string | null; bio: string | null; company: string | null;
  location: string | null; blog: string | null; avatar: string | null; twitter: string | null;
  repos: number; followers: number; following: number; created: Date; hireable: boolean;
}
export interface Repo {
  name: string; fork: boolean; archived: boolean; stars: number; forks: number;
  language: string | null; license: string | null; created: Date;
}
export interface Profile { user: User; repos: Repo[]; pushes: Date[] }

export class GhError extends Error {
  constructor(public kind: 'invalid' | 'notfound' | 'ratelimit' | 'network', public reset?: Date) {
    super(kind);
  }
}

/** Accepts "@user", "github.com/user" or a full profile URL; returns a valid login or null. */
export function parseUsername(input: unknown): string | null {
  if (typeof input !== 'string' || input.length > 120) return null;
  const s = input.trim().replace(/^@/, '').replace(/^(https?:\/\/)?(www\.)?github\.com\//i, '').replace(/\/+$/, '');
  return s.length <= 39 && USERNAME.test(s) ? s : null;
}

const str = (v: unknown, max = 160): string | null =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null;
const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);
const date = (v: unknown): Date => {
  const d = new Date(typeof v === 'string' ? v : NaN);
  return Number.isNaN(d.getTime()) ? new Date(0) : d;
};

/** Only http(s) links survive. Blocks javascript:, data: and friends. */
export function safeUrl(v: unknown, host?: string): string | null {
  const s = str(v, 300);
  if (!s) return null;
  try {
    const u = new URL(/^[a-z][a-z\d+.-]*:/i.test(s) ? s : `https://${s}`);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    if (host && (u.protocol !== 'https:' || u.hostname !== host)) return null;
    return u.href;
  } catch { return null; }
}

export function normUser(j: any): User {
  return {
    login: str(j?.login, 39) ?? '', name: str(j?.name, 80), bio: str(j?.bio, 200),
    company: str(j?.company, 80)?.replace(/^@/, '') ?? null, location: str(j?.location, 80),
    blog: safeUrl(j?.blog), avatar: safeUrl(j?.avatar_url, 'avatars.githubusercontent.com'),
    twitter: parseUsername(j?.twitter_username), repos: num(j?.public_repos),
    followers: num(j?.followers), following: num(j?.following), created: date(j?.created_at),
    hireable: j?.hireable === true,
  };
}

export const normRepos = (j: unknown): Repo[] => (Array.isArray(j) ? j : []).slice(0, 100).map((r: any) => ({
  name: str(r?.name, 100) ?? 'untitled', fork: r?.fork === true, archived: r?.archived === true,
  stars: num(r?.stargazers_count), forks: num(r?.forks_count), language: str(r?.language, 40),
  license: str(r?.license?.spdx_id, 40), created: date(r?.created_at),
}));

export const normPushes = (j: unknown): Date[] => (Array.isArray(j) ? j : [])
  .filter((e: any) => e?.type === 'PushEvent').map((e: any) => date(e?.created_at)).slice(0, 100);

async function get(path: string, optional = false): Promise<unknown> {
  let r: Response;
  try {
    r = await fetch(API + path, {
      headers: { Accept: 'application/vnd.github+json' },
      credentials: 'omit', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(10_000),
    });
  } catch { if (optional) return []; throw new GhError('network'); }
  if (r.ok) return r.json();
  if (optional) return [];
  if (r.status === 404) throw new GhError('notfound');
  if ((r.status === 403 || r.status === 429) && r.headers.get('x-ratelimit-remaining') === '0') {
    throw new GhError('ratelimit', new Date(num(Number(r.headers.get('x-ratelimit-reset'))) * 1000));
  }
  throw new GhError('network');
}

const cache = new Map<string, Promise<Profile>>();

export function fetchProfile(input: string): Promise<Profile> {
  const login = parseUsername(input);
  if (!login) return Promise.reject(new GhError('invalid'));
  const key = login.toLowerCase();
  if (!cache.has(key)) {
    const u = encodeURIComponent(login);
    const p = Promise.all([
      get(`/users/${u}`),
      get(`/users/${u}/repos?per_page=100&sort=pushed&type=owner`, true),
      get(`/users/${u}/events/public?per_page=100`, true),
    ]).then(([user, repos, events]) => ({ user: normUser(user), repos: normRepos(repos), pushes: normPushes(events) }));
    p.catch(() => cache.delete(key));
    cache.set(key, p);
  }
  return cache.get(key)!;
}
