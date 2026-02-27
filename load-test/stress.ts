// load-test/stress.ts
// Hot-path stress test — auth is completely outside the measured loop.
// setup() pre-registers a pool of users (bcrypt runs here, not in thresholds).
// Each VU picks a user by index and only hits blog/comment/user endpoints.
// Build:  pnpm load-test:build
// Run:    pnpm load-test:stress

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Options } from 'k6/options';
import { AuthData, registerAndLogin, authHeaders } from './helpers/auth.js';

import { BASE, ENV_NAME } from './config';

// Number of pre-registered users. VUs round-robin through the pool.
// Keep well below max VUs so tokens are reused (JWTs are stateless — fine).
const POOL_SIZE = 10;

export const options: Options = {
  stages: [
    { duration: '1m', target: 10 },   // warm up
    { duration: '2m', target: 50 },   // ramp up
    { duration: '3m', target: 50 },   // hold
    { duration: '1m', target: 0 },    // ramp down
  ],
  thresholds: {
    // Local thresholds (ENV=local): tight because there's no network latency
    // UAT thresholds (ENV=uat): looser to account for ~80-100ms round-trip to asia-south2
    http_req_failed: ['rate<0.05'],
    ...(ENV_NAME === 'uat'
      ? { http_req_duration: ['p(95)<400', 'p(99)<800'] }
      : { http_req_duration: ['p(95)<200', 'p(99)<500'] }),
  },
};

// Runs once before any VU starts. Not measured in thresholds.
export function setup(): AuthData[] {
  const pool: AuthData[] = [];
  for (let i = 0; i < POOL_SIZE; i++) {
    pool.push(registerAndLogin(i));
  }
  return pool;
}

export default function (pool: AuthData[]): void {
  // Each VU picks a user from the pool deterministically
  const user = pool[(__VU - 1) % pool.length];
  const h = authHeaders(user.accessToken);

  // Tag params with logical names so dynamic IDs don't create unique time series per URL
  const tag = (name: string) => ({ ...h, tags: { name } });

  // Create a blog post
  const blogRes = http.post(
    `${BASE}/blogs`,
    JSON.stringify({ title: `Stress post ${__VU}-${__ITER}`, content: 'Stress test content' }),
    tag('POST /blogs'),
  );
  check(blogRes, { 'create blog 201': (r) => r.status === 201 });
  const blogId = (blogRes.json() as Record<string, string>).blog_id;

  // List blogs
  check(http.get(`${BASE}/blogs`, tag('GET /blogs')), { 'list blogs 200': (r) => r.status === 200 });

  // Get user profile
  check(http.get(`${BASE}/users/me`, tag('GET /users/me')), { 'get me 200': (r) => r.status === 200 });

  if (blogId) {
    // Get the created blog
    check(http.get(`${BASE}/blogs/${blogId}`, tag('GET /blogs/:id')), { 'get blog 200': (r) => r.status === 200 });

    // Add a comment
    const commentRes = http.post(
      `${BASE}/blogs/${blogId}/comments`,
      JSON.stringify({ content: `Stress comment ${__VU}-${__ITER}` }),
      tag('POST /blogs/:id/comments'),
    );
    check(commentRes, { 'create comment 201': (r) => r.status === 201 });

    // List comments
    check(
      http.get(`${BASE}/blogs/${blogId}/comments`, tag('GET /blogs/:id/comments')),
      { 'list comments 200': (r) => r.status === 200 },
    );
  }

  sleep(1);
}
