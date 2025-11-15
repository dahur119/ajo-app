import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const now = Date.now();
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<any>();
    const res = ctx.getResponse<any>();

    const method = req?.method;
    const url = req?.originalUrl || req?.url;
    const requestId = (req?.headers?.['x-request-id'] as string) || req?.requestId || null;
    const userId = req?.user?.userId || req?.user?.sub || null;

    // Start log
    console.log(
      JSON.stringify({
        level: 'info',
        type: 'http_inbound_start',
        requestId,
        method,
        url: String(url),
        userId,
      })
    );

    return next.handle().pipe(
      tap({
        next: () => {
          const durationMs = Date.now() - now;
          const statusCode = res?.statusCode;
          console.log(
            JSON.stringify({
              level: 'info',
              type: 'http_inbound_end',
              requestId,
              method,
              url: String(url),
              statusCode,
              durationMs,
            })
          );
        },
        error: (err) => {
          const durationMs = Date.now() - now;
          const statusCode = err?.status || res?.statusCode || 500;
          console.error(
            JSON.stringify({
              level: 'error',
              type: 'http_inbound_error',
              requestId,
              method,
              url: String(url),
              statusCode,
              durationMs,
              error: err?.message,
            })
          );
        },
      })
    );
  }
}