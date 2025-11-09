import { Module } from '@nestjs/common';
import { GroupsModule } from './groups/groups.module';
import { CyclesModule } from './cycles/cycles.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { TransfersModule } from '../transfers/transfers.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule, GroupsModule, CyclesModule, SchedulerModule, TransfersModule]
})
export class ThriftModule {}
