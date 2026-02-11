import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { APP_GUARD } from '@nestjs/core';
import { join } from 'path';
import { JwtAuthGuard } from '@app/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthController } from './auth/auth.controller';
import { UsersController } from './users/users.controller';
import { BlogsController } from './blogs/blogs.controller';
import { CommentsController } from './comments/comments.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: 'apps/api-gateway/.env' }),
    ClientsModule.registerAsync([
      {
        name: 'AUTH_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            url: config.get<string>('AUTH_SERVICE_URL', 'localhost:5001'),
            package: 'auth',
            protoPath: join(process.cwd(), 'proto/auth.proto'),
            loader: { keepCase: true },
          },
        }),
      },
      {
        name: 'USER_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            url: config.get<string>('USER_SERVICE_URL', 'localhost:5002'),
            package: 'users',
            protoPath: join(process.cwd(), 'proto/users.proto'),
            loader: { keepCase: true },
          },
        }),
      },
      {
        name: 'BLOG_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            url: config.get<string>('BLOG_SERVICE_URL', 'localhost:5003'),
            package: 'blogs',
            protoPath: join(process.cwd(), 'proto/blogs.proto'),
            loader: { keepCase: true },
          },
        }),
      },
      {
        name: 'COMMENT_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            url: config.get<string>('COMMENT_SERVICE_URL', 'localhost:5004'),
            package: 'comments',
            protoPath: join(process.cwd(), 'proto/comments.proto'),
            loader: { keepCase: true },
          },
        }),
      },
    ]),
  ],
  controllers: [AppController, AuthController, UsersController, BlogsController, CommentsController],
  providers: [AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
