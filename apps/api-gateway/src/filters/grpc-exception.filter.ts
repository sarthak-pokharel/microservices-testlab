import { Catch, ArgumentsHost, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

// gRPC status code → HTTP status code
const GRPC_TO_HTTP: Record<number, number> = {
  1: HttpStatus.BAD_REQUEST,          // CANCELLED
  3: HttpStatus.BAD_REQUEST,          // INVALID_ARGUMENT
  4: HttpStatus.GATEWAY_TIMEOUT,      // DEADLINE_EXCEEDED
  5: HttpStatus.NOT_FOUND,            // NOT_FOUND
  6: HttpStatus.CONFLICT,             // ALREADY_EXISTS
  7: HttpStatus.FORBIDDEN,            // PERMISSION_DENIED
  8: HttpStatus.TOO_MANY_REQUESTS,    // RESOURCE_EXHAUSTED
  9: HttpStatus.BAD_REQUEST,          // FAILED_PRECONDITION
  16: HttpStatus.UNAUTHORIZED,        // UNAUTHENTICATED
};

@Catch()
export class GrpcExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // Already an HTTP exception (has a getStatus method)
    if (typeof exception?.getStatus === 'function') {
      const status = exception.getStatus();
      const body = exception.getResponse();
      return response.status(status).json(
        typeof body === 'string' ? { statusCode: status, message: body } : body,
      );
    }

    // gRPC error: has numeric `code` and string `details`
    if (exception?.code !== undefined && exception?.details !== undefined) {
      // NestJS serializes thrown HttpExceptions into the details field as JSON
      try {
        const parsed = JSON.parse(exception.details);
        if (parsed?.statusCode) {
          return response.status(parsed.statusCode).json({
            statusCode: parsed.statusCode,
            message: parsed.message ?? 'An error occurred',
          });
        }
      } catch {
        // details is a plain string, fall through to code mapping
      }

      const httpStatus = GRPC_TO_HTTP[exception.code] ?? HttpStatus.INTERNAL_SERVER_ERROR;
      return response.status(httpStatus).json({
        statusCode: httpStatus,
        message: exception.details || 'An error occurred',
      });
    }

    // Fallback
    const status = exception?.status ?? HttpStatus.INTERNAL_SERVER_ERROR;
    response.status(status).json({
      statusCode: status,
      message: exception?.message ?? 'Internal server error',
    });
  }
}
