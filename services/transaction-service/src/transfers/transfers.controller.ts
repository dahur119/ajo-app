import { Controller, Post, Body } from '@nestjs/common';
import { TransfersService } from './transfers.service';
import type { CreateTransferDto } from './transfers.service';

@Controller('transfers')
export class TransfersController {
  constructor(private readonly service: TransfersService) {}

  @Post()
  create(@Body() dto: CreateTransferDto) {
    return this.service.create(dto);
  }
}