// scripts/docker-push.mjs
// Pushes all 6 service images to Docker Hub.
// Usage: pnpm docker:push
//        Run pnpm docker:build first.

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
  console.log(`\n▶ Pushing ${image} ...`);
  execSync(`docker push ${image}`, { stdio: 'inherit' });
  console.log(`✔ ${image}`);
}

console.log('\n✅ All images pushed to Docker Hub.');
