import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CyclesService } from './cycles.service';
import { CyclesController } from './cycles.controller';
import { Cycle } from './entities/cycle.entity';
import { CycleSlot } from './entities/cycle-slot.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Cycle, CycleSlot])],
  controllers: [CyclesController],
  providers: [CyclesService],
})
export class CyclesModule {}
