import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Inject, OnModuleInit } from '@nestjs/common';
import type { ClientGrpc } from '@nestjs/microservices';
import { Observable, lastValueFrom } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

interface AuthGrpcService {
  validateToken(data: { access_token: string }): Observable<{ valid: boolean; user_id: string; email: string }>;
}

@Injectable()
export class JwtAuthGuard implements CanActivate, OnModuleInit {
  private authService: AuthGrpcService;

  constructor(
    @Inject('AUTH_SERVICE') private readonly client: ClientGrpc,
    private readonly reflector: Reflector,
  ) {}

  onModuleInit() {
    this.authService = this.client.getService<AuthGrpcService>('AuthService');
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const token = authHeader.slice(7);
    const result = await lastValueFrom(this.authService.validateToken({ access_token: token }));
    if (!result.valid) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    request.user = { userId: result.user_id, email: result.email };
    return true;
  }
}
