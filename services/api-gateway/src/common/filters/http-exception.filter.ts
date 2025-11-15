import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const requestId = (req as any).requestId || (req.headers['x-request-id'] as string) || null;
    const isHttp = exception instanceof HttpException;
    const status = isHttp ? (exception as HttpException).getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    // Map status to stable error codes
    const code = this.codeForStatus(status);
    const prod = (process.env.NODE_ENV || '').toLowerCase() === 'production';

    let message = 'Unexpected error';
    let details: any = undefined;

    if (isHttp) {
      const resp: any = (exception as HttpException).getResponse();
      if (typeof resp === 'string') {
        message = resp;
      } else if (resp && typeof resp === 'object') {
        message = resp.message || resp.error || message;
        // Validation pipes often return detailed errors
        details = resp?.message || resp?.details;
      }
    } else if (exception?.message) {
      message = exception.message;
    }

    const payload: any = {
      requestId,
      error: {
        code,
        message,
      },
    };
    if (!prod && details) {
      payload.error.details = details;
    }

    // Always echo request id for correlation
    if (requestId) {
      res.setHeader('x-request-id', requestId);
    }

    res.status(status).json(payload);
  }

  private codeForStatus(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'RATE_LIMITED';
      default:
        return status >= 500 ? 'INTERNAL_ERROR' : 'ERROR';
    }
  }
}