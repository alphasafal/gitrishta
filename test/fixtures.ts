import { normPushes, normRepos, normUser, type Profile } from '../src/github';

export const rawUser = (o: Record<string, unknown> = {}) => ({
  login: 'octo-cat', name: 'Octo Cat', bio: 'I write code', company: '@github', location: 'Jaipur',
  blog: 'octo.dev', avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4', twitter_username: 'octo',
  public_repos: 12, followers: 40, following: 5, created_at: '2015-03-12T10:00:00Z', hireable: true, ...o,
});
export const rawRepos = () => [
  { name: 'shaadi-app', fork: false, stargazers_count: 120, forks_count: 4, language: 'TypeScript', license: { spdx_id: 'MIT' }, created_at: '2016-01-01T00:00:00Z' },
  { name: 'dotfiles', fork: false, stargazers_count: 3, language: 'Shell', license: null, created_at: '2015-05-01T00:00:00Z' },
  { name: 'react', fork: true, stargazers_count: 0, language: 'JavaScript', created_at: '2020-01-01T00:00:00Z' },
];
// 20:30 UTC = 2:00 AM IST
export const rawEvents = () => Array.from({ length: 10 }, () => ({ type: 'PushEvent', created_at: '2024-06-03T20:30:00Z' }));

export const profile = (u = {}, repos: unknown = rawRepos(), ev: unknown = rawEvents()): Profile =>
  ({ user: normUser(rawUser(u)), repos: normRepos(repos), pushes: normPushes(ev) });
