// load-test/smoke.ts
// Quick sanity check: 1 VU, 30s — every endpoint must respond correctly.
// Build:  pnpm load-test:build
// Run:    pnpm load-test:smoke

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Options } from 'k6/options';
import { AuthData, registerAndLogin, authHeaders } from './helpers/auth.js';

import { BASE, ENV_NAME } from './config';

export const options: Options = {
  vus: 1,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],    // <1% errors
    http_req_duration: ['p(95)<500'],  // 95th pct under 500ms
  },
};

export function setup(): AuthData {
  return registerAndLogin();
}

export default function (data: AuthData): void {
  const h = authHeaders(data.accessToken);

  // Health
  check(http.get(`${BASE}/`), { 'health 200': (r) => r.status === 200 });

  // Auth: login
  const loginRes = http.post(
    `${BASE}/auth/login`,
    JSON.stringify({ email: data.email, password: 'LoadTest1!' }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  check(loginRes, { 'login 200': (r) => r.status === 200 });

  // Users: get me
  check(http.get(`${BASE}/users/me`, h), { 'get me 200': (r) => r.status === 200 });

  // Blogs: create
  const blogRes = http.post(
    `${BASE}/blogs`,
    JSON.stringify({ title: 'Smoke test post', content: 'Hello from k6 smoke test' }),
    h,
  );
  check(blogRes, { 'create blog 201': (r) => r.status === 201 });
  const blogBody = blogRes.json() as Record<string, string>;
  const blogId = blogBody.blog_id || blogBody.id;

  // Blogs: list
  check(http.get(`${BASE}/blogs`, h), { 'list blogs 200': (r) => r.status === 200 });

  if (blogId) {
    // Blogs: get one
    check(http.get(`${BASE}/blogs/${blogId}`, h), { 'get blog 200': (r) => r.status === 200 });

    // Comments: create
    const commentRes = http.post(
      `${BASE}/blogs/${blogId}/comments`,
      JSON.stringify({ content: 'k6 smoke comment' }),
      h,
    );
    check(commentRes, { 'create comment 201': (r) => r.status === 201 });

    // Comments: list
    check(
      http.get(`${BASE}/blogs/${blogId}/comments`, h),
      { 'list comments 200': (r) => r.status === 200 },
    );
  }

  sleep(1);
}
