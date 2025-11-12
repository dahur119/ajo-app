import { Controller, Get, All, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AppService } from './app.service';
import { HttpService } from '@nestjs/axios';
import * as Express from 'express';
import { firstValueFrom } from 'rxjs';
import { VerifiedEmailGuard } from './auth/verified-email.guard';
import { makeSignedHeaders } from './auth/gateway-sig.util';

@Controller()
export class AppController {
   constructor(
     private readonly appService: AppService,
     private readonly httpService: HttpService,
   ) {}

   @Get()
   getHello(@Req() req: Express.Request): any {
     const user = (req as any).user || null;
     return { message: this.appService.getHello(), user };
   }

       @All(['users/*', 'api/*'])
       async proxyToUserService(@Req() req: Express.Request, @Res() res: Express.Response) {
         try {
           const forwarded = req.originalUrl.startsWith('/users/')
             ? req.originalUrl.replace('/users', '/api')
             : req.originalUrl;
           // In local dev, user-service runs on localhost:8000 (artisan serve).
           // In Docker, use the service hostname.
           const base = process.env.USER_BASE_URL
             || (process.env.LIVE_E2E === 'true' ? 'http://localhost:8000' : 'http://user-service:8000');
           const url = `${base}${forwarded}`;

           const headers: any = {
             ...req.headers,
           };

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
           console.error('Proxy to user-service failed:', error.response?.status, error.response?.data || error.message);
           res.status(error.response?.status || 500).json(error.response?.data || { error: 'Proxy error' });
         }
       }

  @UseGuards(AuthGuard('jwt'), VerifiedEmailGuard)
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
             ...makeSignedHeaders(req, forwarded),
          },
        }),
      );
       res.status(response.status).json(response.data);
     } catch (error) {
       res.status(error.response?.status || 500).json(error.response?.data || { error: 'Proxy error' });
     }
   }

  @UseGuards(VerifiedEmailGuard)
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
