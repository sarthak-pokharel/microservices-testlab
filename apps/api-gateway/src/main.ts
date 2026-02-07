import './tracing';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { GrpcExceptionFilter } from './filters/grpc-exception.filter';
import { initMetrics } from '@app/common';

async function bootstrap() {
  const { registry } = initMetrics('api-gateway');

  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new GrpcExceptionFilter());

  // Expose Prometheus metrics on the same HTTP server as the gateway
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/metrics', async (_req: any, res: any) => {
    res.setHeader('Content-Type', registry.contentType);
    res.send(await registry.metrics());
  });

  await app.listen(process.env['PORT'] ?? 3000);
  console.log(`API Gateway running on http://0.0.0.0:${process.env['PORT'] ?? 3000}`);
}
bootstrap();
