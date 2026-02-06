// libs/common/src/metrics.ts
// Shared Prometheus metrics factory.
// For gRPC-only services, pass a `port` — this spins up a tiny sidecar HTTP
// server on that port to serve /metrics (gRPC servers have no HTTP listener).
// For the api-gateway, omit `port` and wire the returned registry into Express.

import * as http from 'http';
import { Registry, collectDefaultMetrics, Histogram, Counter } from 'prom-client';

export interface ServiceMetrics {
  registry: Registry;
  grpcDuration: Histogram;
  grpcErrors: Counter;
}

export function initMetrics(serviceName: string, port?: number): ServiceMetrics {
  const registry = new Registry();
  registry.setDefaultLabels({ service: serviceName });
  collectDefaultMetrics({ register: registry });

  const grpcDuration = new Histogram({
    name: 'grpc_method_duration_seconds',
    help: 'Duration of gRPC method calls in seconds',
    labelNames: ['service', 'method', 'status'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    registers: [registry],
  });

  const grpcErrors = new Counter({
    name: 'grpc_method_errors_total',
    help: 'Total number of gRPC method errors',
    labelNames: ['service', 'method'],
    registers: [registry],
  });

  if (port) {
    const server = http.createServer(async (req, res) => {
      if (req.url === '/metrics') {
        res.setHeader('Content-Type', registry.contentType);
        res.end(await registry.metrics());
      } else {
        res.writeHead(404).end();
      }
    });
    server.listen(port, '0.0.0.0', () => {
      console.log(`[${serviceName}] Prometheus metrics available on :${port}/metrics`);
    });

    process.on('SIGTERM', () => server.close());
  }

  return { registry, grpcDuration, grpcErrors };
}
