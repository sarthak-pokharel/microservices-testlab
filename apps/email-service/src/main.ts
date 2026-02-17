import './tracing';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AppModule } from './app.module';
import { HttpToRpcExceptionFilter, AnyExceptionFilter, MetricsInterceptor, initMetrics } from '@app/common';

async function bootstrap() {
  const metrics = initMetrics('email-service', 9205);

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.GRPC,
    options: {
      url: '0.0.0.0:5005',
      package: 'email',
      protoPath: join(process.cwd(), 'proto/email.proto'),
      loader: { keepCase: true },
    },
  });
  app.useGlobalFilters(new AnyExceptionFilter(), new HttpToRpcExceptionFilter());
  app.useGlobalInterceptors(new MetricsInterceptor(metrics));
  await app.listen();
  console.log('Email service running on grpc://0.0.0.0:5005');
}
bootstrap();
