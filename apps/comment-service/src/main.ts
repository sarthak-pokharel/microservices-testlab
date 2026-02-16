import './tracing';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AppModule } from './app.module';
import { HttpToRpcExceptionFilter, MetricsInterceptor, initMetrics } from '@app/common';

async function bootstrap() {
  const metrics = initMetrics('comment-service', 9204);

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.GRPC,
    options: {
      url: '0.0.0.0:5004',
      package: 'comments',
      protoPath: join(process.cwd(), 'proto/comments.proto'),
      loader: { keepCase: true },
    },
  });
  app.useGlobalFilters(new HttpToRpcExceptionFilter());
  app.useGlobalInterceptors(new MetricsInterceptor(metrics));
  await app.listen();
  console.log('Comment service running on grpc://0.0.0.0:5004');
}
bootstrap();
