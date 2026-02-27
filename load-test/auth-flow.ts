// load-test/auth-flow.ts
// Focused test on the full auth flow: register → login → refresh → logout.
// Build:  pnpm load-test:build
// Run:    pnpm load-test:auth

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Options } from 'k6/options';

import { BASE, ENV_NAME } from './config';

export const options: Options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m',  target: 20 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1500'],  // bcrypt is intentionally slow; 1.5s is acceptable under 20 VUs
  },
};

export default function (): void {
  const email = `authflow_${__VU}_${Date.now()}@example.com`;
  const password = 'LoadTest1!';
  const json = { headers: { 'Content-Type': 'application/json' } };

  // Register
  const registerRes = http.post(
    `${BASE}/auth/register`,
    JSON.stringify({ email, password }),
    json,
  );
  check(registerRes, { 'register 201': (r) => r.status === 201 });
  const { access_token, refresh_token, user_id } = registerRes.json() as Record<string, string>;

  const authJson = {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${access_token}` },
  };

  // Login
  const loginRes = http.post(`${BASE}/auth/login`, JSON.stringify({ email, password }), json);
  check(loginRes, { 'login 200': (r) => r.status === 200 });

  // Refresh
  const refreshRes = http.post(
    `${BASE}/auth/refresh`,
    JSON.stringify({ userId: user_id, refreshToken: refresh_token }),
    json,
  );
  check(refreshRes, { 'refresh 200': (r) => r.status === 200 });

  // Logout
  const logoutRes = http.post(`${BASE}/auth/logout`, null, authJson);
  check(logoutRes, { 'logout 200': (r) => r.status === 200 });

  sleep(1);
}
