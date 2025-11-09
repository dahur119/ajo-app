import { Controller, Post, Body, Param, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CyclesService } from './cycles.service';

@UseGuards(AuthGuard('jwt'))
@Controller('cycles')
export class CyclesController {
  constructor(private readonly service: CyclesService) {}

  @Post()
  create(@Body() dto: {
    groupId: string;
    amount: string;
    frequency: string;
    rotationStrategy?: string;
    slots: { userId: string; order: number; scheduledAt?: string }[];
  }) {
    return this.service.create(dto);
  }

  @Post(':id/start')
  start(@Param('id') cycleId: string) {
    return this.service.start(cycleId);
  }

  @Get(':id/status')
  status(@Param('id') cycleId: string) {
    return this.service.status(cycleId);
  }
}
