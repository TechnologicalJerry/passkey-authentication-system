import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter.js';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let mockStatus: ReturnType<typeof vi.fn>;
  let mockJson: ReturnType<typeof vi.fn>;
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    mockJson = vi.fn();
    mockStatus = vi.fn().mockReturnValue({ json: mockJson });

    const mockResponse = {
      status: mockStatus,
    };

    const mockRequest = {
      method: 'POST',
      url: '/api/v1/auth/login',
    };

    mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as unknown as ArgumentsHost;
  });

  it('should format standard HttpException responses correctly', () => {
    const exception = new BadRequestException('Invalid payload provided');

    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        message: 'Invalid payload provided',
        path: '/api/v1/auth/login',
        timestamp: expect.any(String),
      }),
    );
  });

  it('should format validation error responses (with object/array message) correctly', () => {
    const validationErrors = [
      'username must not be empty',
      'email must be an email',
    ];
    const exception = new HttpException(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        message: validationErrors,
      },
      HttpStatus.BAD_REQUEST,
    );

    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        message: validationErrors,
      }),
    );
  });

  it('should mask internal database or runtime errors and never expose details or stack traces', () => {
    const internalError = new Error(
      'FATAL: password authentication failed for user "postgres" at pg_connect()',
    );

    filter.catch(internalError, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        error: 'InternalServerError',
        message: 'An unexpected error occurred',
        path: '/api/v1/auth/login',
      }),
    );

    // Ensure the sensitive message from the Error was NOT leaked to the response
    const calledPayload = mockJson.mock.calls[0]?.[0];
    expect(JSON.stringify(calledPayload)).not.toContain('password');
    expect(JSON.stringify(calledPayload)).not.toContain('pg_connect');
  });

  it('should safely handle non-Error throws', () => {
    filter.catch('string_rejection', mockHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'An unexpected error occurred',
      }),
    );
  });
});
