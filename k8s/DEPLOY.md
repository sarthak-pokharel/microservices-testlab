# GKE UAT Deployment Guide

This deploys all 6 vlogging services to GKE with nginx-ingress, Kubernetes Secrets,
and full observability. The public hostname is `uat-may1-2026.sarthakpokhrel.com.np`.

---

## Prerequisites — install these once on your machine

```bash
# 1. Google Cloud CLI
# Download from: https://cloud.google.com/sdk/docs/install
# Or on Linux:
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
gcloud init   # log in + select/create your GCP project

# 2. kubectl  (the k8s command-line tool)
gcloud components install kubectl

# 3. Helm  (k8s package manager — we use it to install nginx-ingress)
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

---

## Step 1 — Create the GKE cluster

```bash
# Replace YOUR_PROJECT_ID with your GCP project ID.
# us-central1-a is cheap and fast. Pick a zone near you if you prefer.
# e3-standard-2 = 2 vCPU, 8 GB RAM — enough for UAT with 6 services.
# 3 nodes gives headroom for all services + observability.

gcloud container clusters create vlogging-uat \
  --project=YOUR_PROJECT_ID \
  --zone=us-central1-a \
  --num-nodes=3 \
  --machine-type=e2-standard-2 \
  --enable-autoscaling --min-nodes=2 --max-nodes=5 \
  --disk-size=30 \
  --release-channel=regular

# After creation, configure kubectl to talk to this cluster:
gcloud container clusters get-credentials vlogging-uat \
  --zone=us-central1-a \
  --project=YOUR_PROJECT_ID

# Verify:
kubectl get nodes
```

---

## Step 2 — Install nginx-ingress via Helm

```bash
# This installs the nginx Ingress controller into your cluster.
# It creates a Kubernetes LoadBalancer Service which GKE provisions
# a Google Cloud L4 load balancer for, giving you a real external IP.

helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.replicaCount=2

# Wait for the LoadBalancer to get an external IP (takes ~2 min):
kubectl get service ingress-nginx-controller -n ingress-nginx --watch
# You'll see EXTERNAL-IP go from <pending> to a real IP like 34.x.x.x
# Copy that IP — you need it for Cloudflare DNS.
```

---

## Step 3 — Point Cloudflare DNS to the load balancer

1. Log in to your Cloudflare dashboard
2. Select the `sarthakpokhrel.com.np` domain
3. Go to **DNS → Records → Add record**
4. Fill in:
   - **Type**: A
   - **Name**: `uat-may1-2026`
   - **IPv4 address**: (the EXTERNAL-IP from Step 2)
   - **Proxy status**: **DNS only** (grey cloud) for now — enables TLS passthrough for nginx
5. Save. DNS propagates in seconds via Cloudflare.

---

## Step 4 — (Optional) Install cert-manager for HTTPS

```bash
# cert-manager automatically provisions Let's Encrypt TLS certificates.
# Skip this if you only need HTTP for UAT.

helm repo add jetstack https://charts.jetstack.io
helm repo update

helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set crds.enabled=true

# Create the ClusterIssuer (tells cert-manager to use Let's Encrypt):
kubectl apply -f - <<'EOF'
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your@email.com   # <-- change this
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: nginx
EOF
```

If you skip cert-manager, edit `k8s/ingress.yaml` and remove the `tls:` block and the
`cert-manager.io/cluster-issuer` annotation before applying.

---

## Step 5 — Fill in secrets

Edit `k8s/secrets.yaml` and replace all `REPLACE_BASE64` values:

```bash
# Helper: base64-encode a value
echo -n 'your-value-here' | base64

# Example — Postgres password "vlog_secret":
echo -n 'vlog_secret' | base64
# → dmxvZ19zZWNyZXQ=

# Example — auth DATABASE_URL:
echo -n 'postgresql://vlog:vlog_secret@postgres.vlogging-uat.svc.cluster.local:5432/auth_db' | base64

# Generate strong JWT secrets:
openssl rand -base64 48   # run twice, once for access, once for refresh
```

Required values to fill in `k8s/secrets.yaml`:

| Key | Value to encode |
|-----|----------------|
| `POSTGRES_PASSWORD` | `vlog_secret` (or your own) |
| `AUTH_DATABASE_URL` | `postgresql://vlog:<pw>@postgres.vlogging-uat.svc.cluster.local:5432/auth_db` |
| `USER_DATABASE_URL` | `postgresql://vlog:<pw>@postgres.vlogging-uat.svc.cluster.local:5432/user_db` |
| `BLOG_DATABASE_URL` | `postgresql://vlog:<pw>@postgres.vlogging-uat.svc.cluster.local:5432/blog_db` |
| `COMMENT_DATABASE_URL` | `postgresql://vlog:<pw>@postgres.vlogging-uat.svc.cluster.local:5432/comment_db` |
| `REDIS_URL` | `redis://redis.vlogging-uat.svc.cluster.local:6379` |
| `JWT_ACCESS_SECRET` | random 48-byte base64 string |
| `JWT_REFRESH_SECRET` | random 48-byte base64 string |
| `SMTP_HOST` | `smtp.gmail.com` (or leave as dummy for UAT) |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | your Gmail address |
| `SMTP_PASS` | your Gmail app password |
| `EMAIL_FROM` | `"Vlogging UAT <your@gmail.com>"` |

---

## Step 6 — Build and push Docker images

```bash
# From the repo root:
pnpm docker:build   # builds all 6 images tagged sarthak8317/vlogging-<svc>:uat
pnpm docker:push    # pushes to Docker Hub

# This takes ~5-10 minutes on first run (downloading node:22-alpine layers).
# Subsequent runs are faster due to Docker layer caching.
```

---

## Step 7 — Deploy to GKE

Apply manifests in order (namespace first, then secrets, then infra, then apps):

```bash
cd /path/to/vlogging

# 1. Create namespace
kubectl apply -f k8s/namespace.yaml

# 2. Apply secrets (make sure you filled them in Step 5)
kubectl apply -f k8s/secrets.yaml

# 3. Start infrastructure (postgres + redis)
kubectl apply -f k8s/infra/

# Wait for postgres to be ready before starting services that need it
kubectl rollout status statefulset/postgres -n vlogging-uat

# 4. Deploy observability (jaeger, prometheus, grafana)
kubectl apply -f k8s/observability/

# 5. Deploy application services
kubectl apply -f k8s/apps/

# 6. Apply ingress
kubectl apply -f k8s/ingress.yaml

# Check everything is running:
kubectl get pods -n vlogging-uat
kubectl get ingress -n vlogging-uat
```

Expected output of `kubectl get pods`:
```
NAME                               READY   STATUS    RESTARTS
postgres-0                         1/1     Running   0
redis-xxx                          1/1     Running   0
jaeger-xxx                         1/1     Running   0
prometheus-xxx                     1/1     Running   0
grafana-xxx                        1/1     Running   0
auth-service-xxx                   1/1     Running   0
user-service-xxx                   1/1     Running   0
blog-service-xxx (2 pods)          1/1     Running   0
comment-service-xxx (2 pods)       1/1     Running   0
email-service-xxx                  1/1     Running   0
api-gateway-xxx (2 pods)           1/1     Running   0
```

---

## Step 8 — Verify the deployment

```bash
# Test public endpoint (HTTP):
curl http://uat-may1-2026.sarthakpokhrel.com.np/metrics

# Or HTTPS if you set up cert-manager:
curl https://uat-may1-2026.sarthakpokhrel.com.np/metrics

# Test auth API:
curl -X POST https://uat-may1-2026.sarthakpokhrel.com.np/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"Test1234!","username":"tester"}'
```

---

## Step 9 — Access observability tools

These are NOT exposed publicly — use port-forward:

```bash
# Jaeger UI (traces):
kubectl port-forward svc/jaeger 16686:16686 -n vlogging-uat
# Open: http://localhost:16686

# Prometheus (metrics + query):
kubectl port-forward svc/prometheus 9090:9090 -n vlogging-uat
# Open: http://localhost:9090

# Grafana (dashboards):
kubectl port-forward svc/grafana 3001:3000 -n vlogging-uat
# Open: http://localhost:3001
# Login: admin / admin → change password
# Prometheus datasource is auto-configured
```

---

## Updating a service after code changes

```bash
# 1. Rebuild and push the specific service image
DOCKER_USER=sarthak8317 TAG=uat docker build \
  -f apps/auth-service/Dockerfile \
  -t sarthak8317/vlogging-auth-service:uat .
docker push sarthak8317/vlogging-auth-service:uat

# 2. Force a rolling restart (imagePullPolicy: Always pulls the new image)
kubectl rollout restart deployment/auth-service -n vlogging-uat

# Watch the rollout:
kubectl rollout status deployment/auth-service -n vlogging-uat
```

---

## Troubleshooting

```bash
# See logs for a service:
kubectl logs -l app=auth-service -n vlogging-uat --tail=50 -f

# Describe a pod (shows events, image pull errors, etc.):
kubectl describe pod <pod-name> -n vlogging-uat

# Check ingress events:
kubectl describe ingress vlogging-ingress -n vlogging-uat

# Check if secrets are applied correctly (shows keys, not values):
kubectl get secret vlogging-secrets -n vlogging-uat -o yaml

# Exec into a running pod for debugging:
kubectl exec -it <pod-name> -n vlogging-uat -- sh
```

---

## Teardown (when done with UAT)

```bash
# Delete the entire namespace (removes everything inside it):
kubectl delete namespace vlogging-uat

# Delete the GKE cluster (stops billing for compute):
gcloud container clusters delete vlogging-uat \
  --zone=us-central1-a \
  --project=YOUR_PROJECT_ID
```
