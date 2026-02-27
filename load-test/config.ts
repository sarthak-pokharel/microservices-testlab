// load-test/config.ts
// Central config for all load tests.
//
// Usage — pass ENV at runtime:
//   k6 run --env ENV=uat dist/stress.js
//   k6 run --env ENV=local dist/stress.js
//   k6 run --env BASE_URL=http://my-custom-host:3000 dist/stress.js
//
// Priority: BASE_URL env var > ENV preset > default (local)

const ENVIRONMENTS: Record<string, string> = {
  local: 'http://localhost:3000',
  uat:   'https://uat-may1-2026.sarthakpokhrel.com.np',
};

const envName: string = (__ENV.ENV as string) || 'local';

// BASE_URL always wins if explicitly set
export const BASE: string =
  (__ENV.BASE_URL as string) || ENVIRONMENTS[envName] || ENVIRONMENTS['local'];

export const ENV_NAME: string = envName;
