// libs/common/src/interceptors/metrics.interceptor.ts
// Wraps every gRPC handler to record duration and error counts into
// the shared Prometheus registry created by initMetrics().

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import type { ServiceMetrics } from '../metrics.js';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: ServiceMetrics) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
    const method = ctx.getHandler().name;
    const service = ctx.getClass().name;
    const end = this.metrics.grpcDuration.startTimer({ service, method });

    return next.handle().pipe(
      tap(() => end({ status: 'ok' })),
      catchError((err) => {
        end({ status: 'error' });
        this.metrics.grpcErrors.inc({ service, method });
        return throwError(() => err);
      }),
    );
  }
}
