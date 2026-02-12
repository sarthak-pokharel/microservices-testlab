import './tracing';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AppModule } from './app.module';
import { HttpToRpcExceptionFilter, MetricsInterceptor, initMetrics } from '@app/common';

async function bootstrap() {
  const metrics = initMetrics('auth-service', 9201);

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.GRPC,
    options: {
      url: '0.0.0.0:5001',
      package: 'auth',
      protoPath: join(process.cwd(), 'proto/auth.proto'),
      loader: { keepCase: true },
    },
  });
  app.useGlobalFilters(new HttpToRpcExceptionFilter());
  app.useGlobalInterceptors(new MetricsInterceptor(metrics));
  await app.listen();
  console.log('Auth service running on grpc://0.0.0.0:5001');
}
bootstrap();
