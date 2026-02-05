import { Catch, ArgumentsHost } from '@nestjs/common';
import { BaseRpcExceptionFilter } from '@nestjs/microservices';
import { throwError } from 'rxjs';

@Catch()
export class AnyExceptionFilter extends BaseRpcExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const message =
      exception?.response?.body?.errors?.[0]?.message ??
      exception?.message ??
      'Internal server error';
    return throwError(() => ({
      code: 13, // INTERNAL
      details: JSON.stringify({ statusCode: 500, message }),
      message,
    }));
  }
}
