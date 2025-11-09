import { Controller, Get, All, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AppService } from './app.service';
import { HttpService } from '@nestjs/axios';
import * as Express from 'express';
import { firstValueFrom } from 'rxjs';
import { VerifiedEmailGuard } from './auth/verified-email.guard';

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

       @All('api/*')
       async proxyToUserService(@Req() req: Express.Request, @Res() res: Express.Response) {
        const url = `http://user-service:8000${req.originalUrl}`;
      
      // Enhanced debug logging
      console.log('\n=== Incoming Request Debug Info ===');
      console.log('URL:', url);
      console.log('Method:', req.method);
      console.log('Headers:', JSON.stringify(req.headers, null, 2));
      console.log('Raw Body:', req.body);
      console.log('Body Type:', typeof req.body);
      console.log('================================\n');
     try {
       // Ensure we're sending the body correctly
       const requestBody = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
       console.log('Forwarding body:', JSON.stringify(requestBody, null, 2));

       const response = await firstValueFrom(
         this.httpService.request({
           method: req.method,
           url,
           data: requestBody,
           headers: {
             ...req.headers,
             host: 'user-service:8000',
             'Content-Type': 'application/json',
             'x-user-id': (req as any).user?.userId,
             'x-user-email': (req as any).user?.email,
             'x-email-verified': ((req as any).user?.emailVerified ? 'true' : 'false'),
           },
         }),
       );
       res.status(response.status).json(response.data);
     } catch (error) {
       res.status(error.response?.status || 500).json(error.response?.data || { error: 'Proxy error' });
     }
   }

      @UseGuards(AuthGuard('jwt'), VerifiedEmailGuard)
      @All('transactions/*')
      async proxyToTransactionService(@Req() req: Express.Request, @Res() res: Express.Response) {
      const url = `http://transaction-service:3001${req.originalUrl.replace('/transactions', '')}`;
     try {
       const response = await firstValueFrom(
         this.httpService.request({
           method: req.method,
           url,
           data: req.body,
           headers: {
             ...req.headers,
             'x-user-id': (req as any).user?.userId,
             'x-user-email': (req as any).user?.email,
             'x-email-verified': ((req as any).user?.emailVerified ? 'true' : 'false'),
           },
         }),
       );
       res.status(response.status).json(response.data);
     } catch (error) {
       res.status(error.response?.status || 500).json(error.response?.data || { error: 'Proxy error' });
     }
   }

      @UseGuards(AuthGuard('jwt'), VerifiedEmailGuard)
      @All('investments/*')
      async proxyToInvestmentService(@Req() req: Express.Request, @Res() res: Express.Response) {
      const url = `http://investment-service:5000${req.originalUrl.replace('/investments', '')}`;
     try {
       const response = await firstValueFrom(
         this.httpService.request({
           method: req.method,
           url,
           data: req.body,
           headers: {
             ...req.headers,
             'x-user-id': (req as any).user?.userId,
             'x-user-email': (req as any).user?.email,
             'x-email-verified': ((req as any).user?.emailVerified ? 'true' : 'false'),
           },
         }),
       );
       res.status(response.status).json(response.data);
     } catch (error) {
       res.status(error.response?.status || 500).json(error.response?.data || { error: 'Proxy error' });
     }
   }
}
