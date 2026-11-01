import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { ErrorResponse } from '../types/index.js';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { id?: string }>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = 'An unexpected error occurred';
    let errorName = 'InternalServerError';

    const requestId = request?.id ?? (request?.headers?.['x-request-id'] as string) ?? undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resObj = exceptionResponse as Record<string, unknown>;
        message = (resObj['message'] as string | object) ?? exception.message;
        errorName = (resObj['error'] as string) ?? exception.name;
      }
    } else if (exception instanceof Error) {
      // Check for PostgreSQL unique constraint violation (code 23505)
      if ((exception as Record<string, unknown>)?.['code'] === '23505') {
        status = HttpStatus.CONFLICT;
        message = 'A resource with the provided unique identifier already exists';
        errorName = 'ConflictException';
      } else {
        this.logger.error(
          `Unhandled exception on ${request?.method ?? 'UNKNOWN'} ${request?.url ?? 'UNKNOWN'} [reqId: ${requestId ?? 'none'}]: ${exception.message}`,
          exception.stack,
        );
        message = 'An unexpected error occurred';
        errorName = 'InternalServerError';
      }
    } else {
      this.logger.error(
        `Unhandled non-error exception on ${request?.method ?? 'UNKNOWN'} ${request?.url ?? 'UNKNOWN'} [reqId: ${requestId ?? 'none'}]`,
        String(exception),
      );
      message = 'An unexpected error occurred';
      errorName = 'InternalServerError';
    }

    const errorPayload: ErrorResponse = {
      statusCode: status,
      error: errorName,
      message,
      timestamp: new Date().toISOString(),
      path: request?.url ?? '',
      ...(requestId ? { requestId } : {}),
    };

    response.status(status).json(errorPayload);
  }
}
