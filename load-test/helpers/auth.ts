import http from 'k6/http';
import { check } from 'k6';
import { BASE } from '../config';

export interface AuthData {
  accessToken: string;
  userId: string;
  email: string;
}

export function registerAndLogin(idx?: number): AuthData {
  const uid = idx !== undefined ? `pool${idx}` : `${__VU}_${Date.now()}`;
  const email = `loadtest_${uid}_${Date.now()}@example.com`;
  const password = 'LoadTest1!';

  const res = http.post(
    `${BASE}/auth/register`,
    JSON.stringify({ email, password }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  check(res, { 'register 201': (r) => r.status === 201 });

  const body = res.json() as Record<string, string>;
  return {
    accessToken: body.access_token,
    userId: body.user_id,
    email,
  };
}

export function login(email: string, password = 'LoadTest1!'): Record<string, string> {
  const res = http.post(
    `${BASE}/auth/login`,
    JSON.stringify({ email, password }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  check(res, { 'login 200': (r) => r.status === 200 });
  return res.json() as Record<string, string>;
}

export function authHeaders(token: string) {
  return { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } };
}
