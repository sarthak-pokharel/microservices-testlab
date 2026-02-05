import { Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { BaseRpcExceptionFilter } from '@nestjs/microservices';
import { throwError } from 'rxjs';

// HTTP status → gRPC status code
const HTTP_TO_GRPC: Record<number, number> = {
  400: 3,  // INVALID_ARGUMENT
  401: 16, // UNAUTHENTICATED
  403: 7,  // PERMISSION_DENIED
  404: 5,  // NOT_FOUND
  409: 6,  // ALREADY_EXISTS
  429: 8,  // RESOURCE_EXHAUSTED
  500: 13, // INTERNAL
};

@Catch(HttpException)
export class HttpToRpcExceptionFilter extends BaseRpcExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const response = exception.getResponse();
    const statusCode = exception.getStatus();
    const message =
      typeof response === 'string'
        ? response
        : (response as any).message ?? exception.message;

    // Produce a gRPC-compatible error object.
    // Setting `details` to JSON lets the gateway parse the real statusCode.
    return throwError(() => ({
      code: HTTP_TO_GRPC[statusCode] ?? 2,
      details: JSON.stringify({ statusCode, message }),
      message: Array.isArray(message) ? message.join(', ') : message,
    }));
  }
}
