import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { LoggingInterceptor } from './common/logging.interceptor';
import * as Express from 'express';
import crypto from 'crypto';
import { HttpService } from '@nestjs/axios';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { ThrottlerGuard } from '@nestjs/throttler';
import { GlobalHttpExceptionFilter } from './common/filters/http-exception.filter';
import { VersioningType, RequestMethod } from '@nestjs/common';
import client, { Histogram, Registry } from 'prom-client';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Request ID middleware: attach and expose X-Request-Id
  app.use((req: Express.Request, res: Express.Response, next: Express.NextFunction) => {
    const existing = (req.headers['x-request-id'] as string) || '';
    const requestId = existing && existing.length > 0 ? existing : crypto.randomUUID();
    // Attach to request for downstream usage
    (req as any).requestId = requestId;
    // Ensure header is present and visible to clients
    req.headers['x-request-id'] = requestId;
    res.setHeader('x-request-id', requestId);
    next();
  });

  // Global input validation: strip unknown fields, transform primitives, reject non-whitelisted
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));

  // Security headers via Helmet
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    hsts: (process.env.ENABLE_HSTS || '').toLowerCase() === 'true' || (process.env.NODE_ENV || '').toLowerCase() === 'production',
  }));

  // CORS with safe defaults; override via env if needed
  const allowedHeaders = process.env.CORS_ALLOWED_HEADERS || 'Content-Type,Authorization,x-request-id';
  const exposedHeaders = process.env.CORS_EXPOSED_HEADERS || 'x-request-id';
  const methods = process.env.CORS_METHODS || 'GET,POST,PUT,PATCH,DELETE,OPTIONS';
  const originEnv = process.env.CORS_ORIGIN || '';
  let origin: any = true; // default allow for dev; tighten via env
  if (originEnv) {
    // support comma-separated list or single origin; '*' keeps true
    const list = originEnv.split(',').map(s => s.trim()).filter(Boolean);
    if (list.length === 1) {
      origin = list[0] === '*' ? true : list[0];
    } else if (list.length > 1) {
      origin = list;
    }
  }
  app.enableCors({
    origin,
    methods,
    allowedHeaders,
    exposedHeaders,
    credentials: true,
    maxAge: 600,
  });

  // Enable global prefix and API versioning while excluding health/ready/metrics
  const globalPrefix = process.env.GLOBAL_PREFIX || 'api';
  app.setGlobalPrefix(globalPrefix, {
    exclude: [
      { path: 'health', method: RequestMethod.GET },
      { path: 'ready', method: RequestMethod.GET },
      { path: 'metrics', method: RequestMethod.GET },
      { path: 'docs', method: RequestMethod.GET },
      { path: 'docs-json', method: RequestMethod.GET },
    ],
  });
  const apiVersion = process.env.API_VERSION || '1';
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: apiVersion });

  // Global rate limiting guard is bound via APP_GUARD in AppModule

  // Global structured logging interceptor
  app.useGlobalInterceptors(new LoggingInterceptor());
  // Global exception filter
  app.useGlobalFilters(new GlobalHttpExceptionFilter());

  // Basic Prometheus metrics: default + HTTP request counter and duration
  const register: Registry = client.register;
  client.collectDefaultMetrics({ register });
  const httpRequests = new client.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'path', 'status'],
    registers: [register],
  });
  const httpDuration: Histogram = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'path', 'status'],
    buckets: [0.05, 0.1, 0.2, 0.5, 1, 2, 5],
    registers: [register],
  });
  const httpResponseClass = new client.Counter({
    name: 'http_response_class_total',
    help: 'HTTP responses by status class',
    labelNames: ['class'],
    registers: [register],
  });
  const httpOutboundRequests = new client.Counter({
    name: 'http_outbound_requests_total',
    help: 'Total number of outbound HTTP requests',
    labelNames: ['method', 'host', 'status'],
    registers: [register],
  });
  const httpOutboundDuration: Histogram = new client.Histogram({
    name: 'http_outbound_duration_seconds',
    help: 'Outbound HTTP request duration in seconds',
    labelNames: ['method', 'host', 'status'],
    buckets: [0.05, 0.1, 0.2, 0.5, 1, 2, 5],
    registers: [register],
  });
  app.use((req: Express.Request, res: Express.Response, next: Express.NextFunction) => {
    if (req.path === '/metrics') return next();
    const end = httpDuration.startTimer({ method: req.method, path: req.route?.path || req.path });
    res.on('finish', () => {
      const labels = { method: req.method, path: req.route?.path || req.path, status: String(res.statusCode) };
      httpRequests.inc(labels);
      const statusCode = res.statusCode;
      const cls = statusCode >= 500 ? '5xx' : statusCode >= 400 ? '4xx' : statusCode >= 300 ? '3xx' : '2xx';
      httpResponseClass.inc({ class: cls });
      end(labels);
    });
    next();
  });
  // Expose /metrics (unversioned)
  const express = app.getHttpAdapter().getInstance();
  express.get('/metrics', async (_req: Express.Request, res: Express.Response) => {
    res.setHeader('Content-Type', register.contentType);
    res.send(await register.metrics());
  });

  // Swagger API docs at /docs and JSON at /docs-json
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Ajo API Gateway')
    .setDescription('Gateway for user, transaction, and investment services')
    .setVersion(apiVersion.toString())
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'Bearer')
    .build();
  const swaggerDoc = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDoc, {
    jsonDocumentUrl: 'docs-json',
    swaggerOptions: { persistAuthorization: true },
  });

  // Outbound Axios logging with correlation
  const http = app.get(HttpService);
  const axios = http.axiosRef;
  axios.interceptors.request.use((config) => {
    const reqId = (config.headers as any)?.['x-request-id'] || crypto.randomUUID();
    (config.headers as any)['x-request-id'] = reqId;
    const startedAt = Date.now();
    (config as any).__startedAt = startedAt;
    // Prepare outbound metrics labels and timer
    const method = (config.method || 'GET').toUpperCase();
    let host = 'unknown';
    try {
      const u = new URL(config.url!, (config as any).baseURL);
      host = u.host;
    } catch {}
    (config as any).__metricsLabels = { method, host };
    (config as any).__metricsEnd = httpOutboundDuration.startTimer({ method, host });
    // Structured log: outbound request
    console.log(JSON.stringify({
      level: 'info',
      type: 'http_outbound_start',
      requestId: reqId,
      method: config.method,
      url: config.url,
    }));
    return config;
  });
  axios.interceptors.response.use(
    (response) => {
      const reqId = (response.config.headers as any)?.['x-request-id'] || null;
      const startedAt = (response.config as any).__startedAt || Date.now();
      const durationMs = Date.now() - startedAt;
      const baseLabels = (response.config as any).__metricsLabels || { method: (response.config.method || 'GET').toUpperCase(), host: 'unknown' };
      const labels = { ...baseLabels, status: String(response.status) };
      httpOutboundRequests.inc(labels);
      const end = (response.config as any).__metricsEnd;
      if (typeof end === 'function') end(labels);
      console.log(JSON.stringify({
        level: 'info',
        type: 'http_outbound_end',
        requestId: reqId,
        status: response.status,
        url: response.config.url,
        durationMs,
      }));
      return response;
    },
    async (error) => {
      const cfg = error?.config || {};
      const reqId = (cfg.headers as any)?.['x-request-id'] || null;
      const startedAt = (cfg as any).__startedAt || Date.now();
      const durationMs = Date.now() - startedAt;
      let host = 'unknown';
      try {
        const u = new URL(cfg.url!, (cfg as any).baseURL);
        host = u.host;
      } catch {}
      const method = (cfg.method || 'GET').toUpperCase();
      const baseLabels = (cfg as any).__metricsLabels || { method, host };
      const statusLabel = error?.response?.status ? String(error.response.status) : 'ERR';
      const labels = { ...baseLabels, status: statusLabel };
      try {
        httpOutboundRequests.inc(labels);
        const end = (cfg as any).__metricsEnd;
        if (typeof end === 'function') end(labels);
      } catch {}

      // Basic retry policy: up to N retries on network timeouts or 5xx
      const maxRetries = Number(process.env.OUTBOUND_HTTP_MAX_RETRIES || 2);
      const retryDelayMs = Number(process.env.OUTBOUND_HTTP_RETRY_DELAY_MS || 200);
      const status = error?.response?.status;
      const shouldRetry = (!status || status >= 500) && (cfg.method || 'GET').toUpperCase() !== 'POST';
      cfg.__retryCount = (cfg.__retryCount || 0);

      if (shouldRetry && cfg.__retryCount < maxRetries) {
        cfg.__retryCount += 1;
        // preserve correlation header
        if (reqId) {
          (cfg.headers as any)['x-request-id'] = reqId;
        }
        await new Promise(r => setTimeout(r, retryDelayMs));
        console.warn(JSON.stringify({
          level: 'warn',
          type: 'http_outbound_retry',
          requestId: reqId,
          url: cfg.url,
          method: cfg.method,
          attempt: cfg.__retryCount,
        }));
        return axios.request(cfg);
      }

      console.error(JSON.stringify({
        level: 'error',
        type: 'http_outbound_error',
        requestId: reqId,
        url: cfg.url,
        method: cfg.method,
        durationMs,
        error: error?.message,
        status,
      }));
      return Promise.reject(error);
    }
  );
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
