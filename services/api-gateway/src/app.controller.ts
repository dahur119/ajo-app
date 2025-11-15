import { Controller, Get, All, Req, Res, UseGuards, Version } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AppService } from './app.service';
import { HttpService } from '@nestjs/axios';
import * as Express from 'express';
import { firstValueFrom } from 'rxjs';
import { VerifiedEmailGuard } from './auth/verified-email.guard';
import { makeSignedHeaders } from './auth/gateway-sig.util';
import { SkipThrottle } from '@nestjs/throttler';
import { Roles } from './auth/roles.decorator';
import { RolesGuard } from './auth/roles.guard';
import client from 'prom-client';

@Controller()
export class AppController {
   constructor(
     private readonly appService: AppService,
     private readonly httpService: HttpService,
   ) {}

  @Get()
  getHello(@Req() req: Express.Request): any {
    const user = (req as any).user || null;
    const requestId = (req as any).requestId || (req.headers['x-request-id'] as string) || null;
    return { message: this.appService.getHello(), user, requestId };
    }

  @SkipThrottle()
  @Version('neutral')
  @Get('/metrics')
  async metrics(@Res() res: Express.Response) {
    res.setHeader('Content-Type', client.register.contentType);
    res.send(await client.register.metrics());
  }

   @SkipThrottle()
   @Get('/health')
   health(@Req() req: Express.Request): any {
     const requestId = (req as any).requestId || (req.headers['x-request-id'] as string) || null;
     return {
       status: 'ok',
       uptime: process.uptime(),
       timestamp: new Date().toISOString(),
       requestId,
     };
   }

  @SkipThrottle()
  @Get('/ready')
  async ready(@Req() req: Express.Request): Promise<any> {
    const requestId = (req as any).requestId || (req.headers['x-request-id'] as string) || null;
    // Metrics: readiness gauges (create once if not present)
    const serviceReadyGauge = (client.getSingleMetric('gateway_service_ready') as any) || new client.Gauge({
      name: 'gateway_service_ready',
      help: 'Service readiness (1 ready, 0 not)',
      labelNames: ['service'],
    });
    const overallReadyGauge = (client.getSingleMetric('gateway_ready_overall') as any) || new client.Gauge({
      name: 'gateway_ready_overall',
      help: 'Gateway overall readiness (1 ready, 0 not)',
    });

    const services = [
      {
        key: 'user',
        base: process.env.USER_BASE_URL || (process.env.LIVE_E2E === 'true' ? 'http://localhost:8000' : 'http://user-service:8000'),
        path: '/health',
      },
      {
        key: 'transaction',
        base: process.env.TXN_BASE_URL || (process.env.LIVE_E2E === 'true' ? 'http://localhost:3001' : 'http://transaction-service:3001'),
        path: '/health',
      },
      {
        key: 'investment',
        base: process.env.INVESTMENT_BASE_URL || (process.env.LIVE_E2E === 'true' ? 'http://localhost:5233' : 'http://investment-service:5000'),
        path: '/health',
      },
    ];

    async function probe(target: { key: string; base?: string; path: string }) {
      const started = Date.now();
      const url = target.base ? `${target.base}${target.path}` : undefined;
      if (!url) {
        return { key: target.key, ok: false, skipped: true, reason: 'missing_base_url', durationMs: Date.now() - started };
      }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);
      try {
        const res = await fetch(url, {
          headers: { 'x-request-id': requestId || '' },
          signal: controller.signal,
        } as any);
        clearTimeout(timeout);
        let body: any = null;
        try {
          body = await res.json();
        } catch {
          body = null;
        }
        return {
          key: target.key,
          url,
          ok: res.ok && (body?.status === 'ok' || body?.ready === true),
          statusCode: res.status,
          durationMs: Date.now() - started,
          response: body,
        };
      } catch (err: any) {
        clearTimeout(timeout);
        return {
          key: target.key,
          url,
          ok: false,
          error: err?.message || 'probe_error',
          durationMs: Date.now() - started,
        };
      }
    }

    const results = await Promise.all(services.map(s => probe(s)));
    const summary: Record<string, any> = {};
    for (const r of results) summary[r.key] = r;
    const allReady = results.every(r => r.ok || r.skipped);

    // Update gauges based on readiness
    try {
      for (const r of results) {
        const value = (r.ok || r.skipped) ? 1 : 0;
        (serviceReadyGauge as any).labels(r.key).set(value);
      }
      (overallReadyGauge as any).set(allReady ? 1 : 0);
    } catch {}

    return {
      ready: allReady,
      timestamp: new Date().toISOString(),
      requestId,
      services: summary,
    };
  }

       @All(['users/*', 'api/*'])
       async proxyToUserService(@Req() req: Express.Request, @Res() res: Express.Response) {
           const forwarded = req.originalUrl.startsWith('/users/')
             ? req.originalUrl.replace('/users', '/api')
             : req.originalUrl;
           // In local dev, user-service runs on localhost:8000 (artisan serve).
           // In Docker, use the service hostname.
           const base = process.env.USER_BASE_URL
             || (process.env.LIVE_E2E === 'true' ? 'http://localhost:8000' : 'http://user-service:8000');
           const url = `${base}${forwarded}`;
         try {

          const headers: any = {
            ...req.headers,
          };

          // Ensure correlation header propagates downstream
          headers['x-request-id'] = (req as any).requestId || (req.headers['x-request-id'] as string);

           if ((req as any).user) {
             headers['x-user-id'] = (req as any).user.userId;
             headers['x-user-email'] = (req as any).user.email;
             headers['x-email-verified'] = ((req as any).user.emailVerified ? 'true' : 'false');
           }

           const response = await firstValueFrom(
             this.httpService.request({
               method: req.method,
               url,
               data: req.body,
               headers,
             }),
           );

           res.status(response.status).json(response.data);
         } catch (error) {
          console.error(JSON.stringify({
            level: 'error',
            type: 'proxy_error',
            target: 'user-service',
            url: url,
            requestId: (req as any).requestId || (req.headers['x-request-id'] as string) || null,
            status: error.response?.status,
            error: error.response?.data || error.message,
          }));
           res.status(error.response?.status || 500).json(error.response?.data || { error: 'Proxy error' });
         }
        }

  @UseGuards(AuthGuard('jwt'), VerifiedEmailGuard, RolesGuard)
  @All('transactions/*')
  async proxyToTransactionService(@Req() req: Express.Request, @Res() res: Express.Response) {
      const forwarded = req.originalUrl.replace('/transactions', '');
      const base = process.env.TXN_BASE_URL || (process.env.LIVE_E2E === 'true' ? 'http://localhost:3001' : 'http://transaction-service:3001');
      const url = `${base}${forwarded}`;
      try {
        const response = await firstValueFrom(
          this.httpService.request({
            method: req.method,
            url,
          data: req.body,
          headers: {
            ...req.headers,
            'x-user-email': (req as any).user?.email,
            'x-email-verified': ((req as any).user?.emailVerified ? 'true' : 'false'),
            'x-request-id': (req as any).requestId || (req.headers['x-request-id'] as string),
             ...makeSignedHeaders(req, forwarded),
          },
        }),
      );
       res.status(response.status).json(response.data);
     } catch (error) {
       console.error(JSON.stringify({
         level: 'error',
         type: 'proxy_error',
         target: 'transaction-service',
         url,
         requestId: (req as any).requestId || (req.headers['x-request-id'] as string) || null,
         status: error.response?.status,
         error: error.response?.data || error.message,
       }));
       res.status(error.response?.status || 500).json(error.response?.data || { error: 'Proxy error' });
     }
    }

  @UseGuards(AuthGuard('jwt'), VerifiedEmailGuard, RolesGuard)
  @All('investments/*')
  async proxyToInvestmentService(@Req() req: Express.Request, @Res() res: Express.Response) {
      const base = process.env.INVESTMENT_BASE_URL || (process.env.LIVE_E2E === 'true' ? 'http://localhost:5233' : 'http://investment-service:5000');
      const forwarded = req.originalUrl.replace('/investments', '');
      const url = `${base}${forwarded}`;
      try {
        const response = await firstValueFrom(
          this.httpService.request({
            method: req.method,
            url,
          data: req.body,
          headers: {
            ...req.headers,
            'x-user-email': (req as any).user?.email,
            'x-email-verified': ((req as any).user?.emailVerified ? 'true' : 'false'),
             ...makeSignedHeaders(req, forwarded),
          },
        }),
      );
        res.status(response.status).json(response.data);
      } catch (error) {
        res.status(error.response?.status || 500).json(error.response?.data || { error: 'Proxy error' });
      }
  }
}
