import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { TransfersService } from './transfers.service';
import type { CreateTransferDto } from './transfers.service';
import { JwtGuard } from '../auth/jwt.guard';

@UseGuards(JwtGuard)
@Controller('transfers')
export class TransfersController {
  constructor(private readonly service: TransfersService) {}

  @Post()
  create(@Body() dto: CreateTransferDto) {
    return this.service.create(dto);
  }
}