import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtGuard } from './jwt.guard';
import type { Request } from 'express';

@Controller('auth')
export class ProbeController {
  @UseGuards(JwtGuard)
  @Get('probe')
  probe(@Req() req: Request) {
    const userId = (req as any).user?.userId || null;
    return { userId, authScheme: userId ? 'JWT' : 'none' };
  }
}