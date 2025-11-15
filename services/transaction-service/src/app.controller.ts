import { Controller, Get, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import crypto from 'crypto';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  health(@Req() req: Request, @Res() res: Response) {
    const requestId = req.header('x-request-id') || crypto.randomUUID();
    res.setHeader('x-request-id', requestId);
    return res.status(200).json({ status: 'ok', timestamp: new Date().toISOString(), requestId });
  }

  @Get('ready')
  ready(@Req() req: Request, @Res() res: Response) {
    const requestId = req.header('x-request-id') || crypto.randomUUID();
    res.setHeader('x-request-id', requestId);
    return res.status(200).json({ ready: true, timestamp: new Date().toISOString(), requestId });
  }
}
