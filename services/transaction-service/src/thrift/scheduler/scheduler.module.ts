import { Module, forwardRef } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulerService } from './scheduler/scheduler.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CycleSlot } from '../cycles/entities/cycle-slot.entity';
import { Cycle } from '../cycles/entities/cycle.entity';
import { TransfersModule } from '../../transfers/transfers.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([Cycle, CycleSlot]),
    forwardRef(() => TransfersModule),
  ],
  providers: [SchedulerService],
})
export class SchedulerModule {}
