# Blogging Platform

A NestJS microservices backend built to do more than pass requests in Postman.

This project started as a simple blogging platform, but the real point was to learn how a backend behaves when it is under load, traced across services, measured over time, and deployed to something closer to real infrastructure.

The app is intentionally small: auth, users, blogs, comments, and email. The stack around it is the interesting part. REST at the edge, gRPC between services, PostgreSQL for data, Redis and BullMQ for jobs, Prometheus for metrics, Jaeger for traces, Grafana for dashboards, k6 for load testing, Docker for local runs, and Kubernetes manifests for GKE.

Postman can tell you an endpoint works. This project is for everything after that.

## What This Is

The API gateway exposes HTTP endpoints and talks to internal services over gRPC.

- `api-gateway`: public HTTP API, validation, auth guard, gRPC clients, `/metrics`
- `auth-service`: registration, login, refresh tokens, JWT validation, bcrypt hashing
- `user-service`: profiles, followers, following, notification jobs
- `blog-service`: blog and vlog posts, author ownership checks, publication events
- `comment-service`: comments and threaded replies
- `email-service`: queued email delivery with dry-run support when SMTP is not configured
- `libs/common`: shared guards, decorators, exception filters, metrics, tracing
- `proto`: gRPC contracts between services
- `load-test`: k6 smoke, auth-flow, and stress scenarios
- `k8s`: Kubernetes manifests for app services, infra, ingress, and observability

## Architecture

```txt
                    HTTP
                 +--------+
                 | k6 /   |
                 | client |
                 +---+----+
                     |
                     v
              +-------------+
              | api-gateway |
              +------+------+
                     |
          gRPC       | validates tokens through auth-service
     +---------------+------------------+
     |               |                  |
     v               v                  v
+------------+  +------------+    +----------------+
| auth       |  | user       |    | blog           |
| service    |  | service    |    | service        |
+-----+------+  +-----+------+    +--------+-------+
      |               |                    |
      v               v                    v
 PostgreSQL      PostgreSQL             PostgreSQL
      |
      v
   Redis / BullMQ  <---- blog-published / email jobs
      |
      v
+-------------+      +----------------+
| email       |      | comment        |
| service     |      | service        |
+-------------+      +--------+-------+
                            |
                            v
                       PostgreSQL
```

Observability runs beside the app:

- Jaeger receives OpenTelemetry traces.
- Prometheus scrapes `/metrics` from the gateway and gRPC services.
- Grafana sits on top of Prometheus.

## Tech Stack

- Node.js 22
- NestJS 11
- TypeScript
- gRPC with `@nestjs/microservices`
- PostgreSQL 16
- TypeORM
- Redis 7
- BullMQ
- JWT and bcrypt
- OpenTelemetry
- Jaeger
- Prometheus
- Grafana
- Docker Compose
- Kubernetes / GKE
- k6

## Project Layout

```txt
apps/
  api-gateway/
  auth-service/
  user-service/
  blog-service/
  comment-service/
  email-service/
libs/
  common/
proto/
docker/
k8s/
load-test/
scripts/
```

## Local Setup

Install dependencies:

```bash
pnpm install
```

Create local environment files from the checked-in examples:

```bash
cp apps/api-gateway/.env.example apps/api-gateway/.env
cp apps/auth-service/.env.example apps/auth-service/.env
cp apps/user-service/.env.example apps/user-service/.env
cp apps/blog-service/.env.example apps/blog-service/.env
cp apps/comment-service/.env.example apps/comment-service/.env
```

The real `.env` files are ignored by Git. So is `k8s/secrets.yaml`. Keep it that way.

Start Postgres and Redis:

```bash
docker compose up -d postgres redis
```

Start every service in watch mode:

```bash
pnpm dev
```

The gateway runs on:

```txt
http://localhost:3000
```

The gRPC services listen on:

```txt
auth-service     localhost:5001
user-service     localhost:5002
blog-service     localhost:5003
comment-service  localhost:5004
email-service    localhost:5005
```

Metrics are exposed on:

```txt
api-gateway      http://localhost:3000/metrics
auth-service     http://localhost:9201/metrics
user-service     http://localhost:9202/metrics
blog-service     http://localhost:9203/metrics
comment-service  http://localhost:9204/metrics
email-service    http://localhost:9205/metrics
```

## Useful Commands

```bash
# Build all services
pnpm build:all

# Run unit tests
pnpm exec jest --runInBand

# Run the gateway e2e test
pnpm test:e2e

# Reset local service databases
pnpm db:clean

# Format source files
pnpm format

# Lint source files
pnpm lint
```

Note: the current e2e Jest config may need the same `@app/common` module mapping used by the root Jest config.

## API Surface

Auth:

```txt
POST /auth/register
POST /auth/login
POST /auth/refresh
POST /auth/logout
```

Users:

```txt
POST /users/profile
GET  /users/me
GET  /users/:userId
PUT  /users/profile
POST /users/:userId/follow
POST /users/:userId/unfollow
GET  /users/:userId/followers
GET  /users/:userId/following
```

Blogs:

```txt
POST   /blogs
GET    /blogs
GET    /blogs/:blogId
PUT    /blogs/:blogId
DELETE /blogs/:blogId
```

Comments:

```txt
POST   /blogs/:blogId/comments
GET    /blogs/:blogId/comments
DELETE /blogs/:blogId/comments/:commentId
```

Public routes use the `@Public()` decorator. Everything else goes through the global JWT guard in the gateway, which calls `auth-service` over gRPC to validate the access token.

## Load Testing

k6 scripts live in `load-test/`.

Build the scripts:

```bash
pnpm load-test:build
```

Run the smoke test:

```bash
pnpm load-test:smoke
```

Run the auth flow:

```bash
pnpm load-test:auth
```

Run the hot-path stress test:

```bash
pnpm load-test:stress
```

There are UAT variants too:

```bash
pnpm load-test:smoke:uat
pnpm load-test:auth:uat
pnpm load-test:stress:uat
```

The stress test intentionally pre-registers users in `setup()` and reuses tokens during the measured run. That keeps bcrypt from dominating every number and lets the test focus on the hot path: blogs, comments, and user reads.

## Observability

This project uses both traces and metrics because they answer different questions.

Prometheus tells you something is happening:

- request duration
- error count
- service health
- throughput over time

Jaeger tells you where time went inside a specific request:

- HTTP gateway span
- gRPC client and server spans
- database spans
- custom bcrypt spans

The auth service manually instruments bcrypt because password hashing is CPU-heavy and otherwise looks like missing time inside a trace:

```ts
const valid = await tracer.startActiveSpan('bcrypt.compare', async (span) => {
  try {
    return await bcrypt.compare(password, user.passwordHash);
  } finally {
    span.end();
  }
});
```

That is the kind of thing Postman never shows you.

Run the full local observability stack:

```bash
docker compose up -d
```

Then open:

```txt
Jaeger      http://localhost:16686
Prometheus  http://localhost:9090
Grafana     http://localhost:3001
```

Grafana uses `admin` as the local development password in `docker-compose.yml`.

## Docker Images

Build all service images:

```bash
pnpm docker:build
```

Push all service images:

```bash
pnpm docker:push
```

The image scripts default to:

```txt
DOCKER_USER=sarthak8317
TAG=uat
```

Override them when needed:

```bash
DOCKER_USER=your-user TAG=your-tag pnpm docker:build
```

## Kubernetes / GKE

Kubernetes manifests are under `k8s/`.

The deployment includes:

- namespace
- PostgreSQL StatefulSet
- Redis Deployment
- all six app services
- nginx ingress target
- Jaeger
- Prometheus
- Grafana
- HPA for selected services

The full deployment walkthrough is in:

```txt
k8s/DEPLOY.md
```

Real Kubernetes secrets are not committed. Create `k8s/secrets.yaml` locally or in your deployment pipeline.

## Security Notes

- Real `.env` files are ignored.
- `k8s/secrets.yaml` is ignored.
- Docker Compose contains development placeholders only.
- JWT access and refresh secrets must be replaced outside local development.
- SMTP credentials belong in environment variables or Kubernetes secrets, never in Git.

## What I Learned Building This

The biggest lesson was not that load testing exists. I already knew that.

The lesson was that a backend can look fine in Postman and still behave very differently under concurrency. k6 showed that bcrypt could dominate auth latency. Jaeger showed exactly where that time was going. Prometheus gave the system-level view. Kubernetes showed what changed once services stopped fighting for the same local CPU.

That is why this repo has more than controllers and services. The app is small on purpose. The system around it is the real exercise.
