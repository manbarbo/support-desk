import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LOGGER } from '@infrastructure/logging/logger.interface';
import type { Logger } from '@infrastructure/logging/logger.interface';
import type { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(@Inject(LOGGER) private readonly logger: Logger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const { method, url, body } = request;
    const start = Date.now();

    const sanitizedBody = this.sanitizeBody(body);

    this.logger.info('Incoming request', {
      context: 'HTTP',
      method,
      path: url,
      ...(Object.keys(sanitizedBody).length > 0 && { body: sanitizedBody }),
    });

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - start;
          const statusCode = response.statusCode;

          this.logger.info('Response sent', {
            context: 'HTTP',
            method,
            path: url,
            statusCode,
            duration,
          });
        },
        error: (error) => {
          const duration = Date.now() - start;
          const statusCode = response.statusCode || 500;

          this.logger.error('Request failed', {
            context: 'HTTP',
            method,
            path: url,
            statusCode,
            duration,
            error: error.message,
            stack: error.stack,
          });
        },
      }),
    );
  }

  private sanitizeBody(body: any): Record<string, unknown> {
    if (!body || typeof body !== 'object') {
      return {};
    }

    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'key'];
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(body)) {
      if (sensitiveFields.some((field) => key.toLowerCase().includes(field))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}
