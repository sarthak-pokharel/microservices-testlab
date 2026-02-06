// libs/common/src/tracing.ts
// IMPORTANT: this file must import ONLY @opentelemetry/* packages.
// Do NOT import @app/common or @nestjs/* here — that would pull in @grpc/grpc-js
// before the SDK has a chance to patch it, breaking gRPC instrumentation.

import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { NestInstrumentation } from '@opentelemetry/instrumentation-nestjs-core';
import { GrpcInstrumentation } from '@opentelemetry/instrumentation-grpc';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';

export function initTracing(serviceName: string): void {
  const exporterUrl =
    process.env['OTEL_ENDPOINT'] ?? 'http://localhost:4318/v1/traces';

  const sdk = new NodeSDK({
    resource: resourceFromAttributes({ [ATTR_SERVICE_NAME]: serviceName }),
    traceExporter: new OTLPTraceExporter({ url: exporterUrl }),
    instrumentations: [
      new HttpInstrumentation(),
      new ExpressInstrumentation(),
      new GrpcInstrumentation(),
      new NestInstrumentation(),
      new PgInstrumentation(),
    ],
  });

  sdk.start();

  process.on('SIGTERM', () => {
    sdk.shutdown().finally(() => process.exit(0));
  });
}
