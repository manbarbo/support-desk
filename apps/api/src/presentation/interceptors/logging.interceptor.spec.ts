import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';
import { LOGGER } from '@infrastructure/logging/logger.interface';
import { createMockLogger } from '../../__mocks__/mocks';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let logger: ReturnType<typeof createMockLogger>;

  beforeEach(async () => {
    logger = createMockLogger();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoggingInterceptor,
        { provide: LOGGER, useValue: logger },
      ],
    }).compile();

    interceptor = module.get<LoggingInterceptor>(LoggingInterceptor);
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  describe('intercept', () => {
    it('should log incoming request', (done) => {
      const mockRequest = {
        method: 'POST',
        url: '/tickets',
        body: { customerId: '123', title: 'Test' },
      };
      const mockResponse = { statusCode: 201 };
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
          getResponse: () => mockResponse,
        }),
      } as ExecutionContext;

      const mockCallHandler: CallHandler = {
        handle: () => of({ id: '1' }),
      };

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        next: () => {
          expect(logger.info).toHaveBeenCalledWith(
            'Incoming request',
            expect.objectContaining({
              context: 'HTTP',
              method: 'POST',
              path: '/tickets',
            }),
          );
          done();
        },
      });
    });

    it('should log response on success', (done) => {
      const mockRequest = {
        method: 'GET',
        url: '/tickets/123',
        body: undefined,
      };
      const mockResponse = { statusCode: 200 };
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
          getResponse: () => mockResponse,
        }),
      } as ExecutionContext;

      const mockCallHandler: CallHandler = {
        handle: () => of({ id: '123' }),
      };

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        next: () => {
          expect(logger.info).toHaveBeenCalledWith(
            'Response sent',
            expect.objectContaining({
              context: 'HTTP',
              method: 'GET',
              path: '/tickets/123',
              statusCode: 200,
              duration: expect.any(Number),
            }),
          );
          done();
        },
      });
    });

    it('should log error on failure', (done) => {
      const mockRequest = {
        method: 'GET',
        url: '/tickets/999',
        body: undefined,
      };
      const mockResponse = { statusCode: 404 };
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
          getResponse: () => mockResponse,
        }),
      } as ExecutionContext;

      const testError = new Error('Not found');
      const mockCallHandler: CallHandler = {
        handle: () => {
          return new Observable((subscriber) => {
            subscriber.error(testError);
          });
        },
      };

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        error: () => {
          expect(logger.error).toHaveBeenCalledWith(
            'Request failed',
            expect.objectContaining({
              context: 'HTTP',
              method: 'GET',
              path: '/tickets/999',
              error: 'Not found',
            }),
          );
          done();
        },
      });
    });

    it('should sanitize sensitive fields from body', (done) => {
      const mockRequest = {
        method: 'POST',
        url: '/auth/login',
        body: { username: 'admin', password: 'secret123', token: 'abc' },
      };
      const mockResponse = { statusCode: 200 };
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
          getResponse: () => mockResponse,
        }),
      } as ExecutionContext;

      const mockCallHandler: CallHandler = {
        handle: () => of({ success: true }),
      };

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        next: () => {
          expect(logger.info).toHaveBeenCalledWith(
            'Incoming request',
            expect.objectContaining({
              body: {
                username: 'admin',
                password: '[REDACTED]',
                token: '[REDACTED]',
              },
            }),
          );
          done();
        },
      });
    });

    it('should handle empty body', (done) => {
      const mockRequest = {
        method: 'GET',
        url: '/tickets',
        body: undefined,
      };
      const mockResponse = { statusCode: 200 };
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
          getResponse: () => mockResponse,
        }),
      } as ExecutionContext;

      const mockCallHandler: CallHandler = {
        handle: () => of([]),
      };

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        next: () => {
          expect(logger.info).toHaveBeenCalledWith(
            'Incoming request',
            expect.not.objectContaining({
              body: expect.anything(),
            }),
          );
          done();
        },
      });
    });
  });
});
