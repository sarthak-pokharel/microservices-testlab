// scripts/docker-build.mjs
// Builds all 6 service images and tags them for Docker Hub.
// Usage: pnpm docker:build
//        DOCKER_USER=sarthak8317 TAG=uat pnpm docker:build
//
// What this does:
//   docker build -f apps/<svc>/Dockerfile -t sarthak8317/vlogging-<svc>:uat .
// The build context is always the repo root so webpack can resolve @app/common.

import { execSync } from 'child_process';

const USER = process.env.DOCKER_USER ?? 'sarthak8317';
const TAG  = process.env.TAG ?? 'uat';

const services = [
  'api-gateway',
  'auth-service',
  'user-service',
  'blog-service',
  'comment-service',
  'email-service',
];

for (const svc of services) {
  const image = `${USER}/vlogging-${svc}:${TAG}`;
  console.log(`\n▶ Building ${image} ...`);
  execSync(
    `docker build -f apps/${svc}/Dockerfile -t ${image} .`,
    { stdio: 'inherit' },
  );
  console.log(`✔ ${image}`);
}

console.log('\n✅ All images built.');
