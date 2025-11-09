import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Cycle } from './entities/cycle.entity';
import { CycleSlot } from './entities/cycle-slot.entity';

@Injectable()
export class CyclesService {
  constructor(
    @InjectRepository(Cycle) private readonly cycleRepo: Repository<Cycle>,
    @InjectRepository(CycleSlot) private readonly slotRepo: Repository<CycleSlot>,
  ) {}

  async create(dto: {
    groupId: string;
    amount: string;
    frequency: string;
    rotationStrategy?: string;
    slots: { userId: string; order: number; scheduledAt?: string }[];
  }) {
    const cycle = this.cycleRepo.create({
      groupId: dto.groupId,
      amount: dto.amount,
      frequency: dto.frequency,
      rotationStrategy: dto.rotationStrategy ?? 'fixed',
      status: 'draft',
    });
    await this.cycleRepo.save(cycle);

    const slots = dto.slots.map((s) =>
      this.slotRepo.create({
        cycleId: cycle.id,
        userId: s.userId,
        order: s.order,
        scheduledAt: s.scheduledAt ? new Date(s.scheduledAt) : null,
        status: 'pending',
      }),
    );
    await this.slotRepo.save(slots);

    return { cycle, slots };
  }

  async start(cycleId: string) {
    const cycle = await this.cycleRepo.findOneByOrFail({ id: cycleId });
    cycle.status = 'active';
    cycle.startAt = new Date();
    await this.cycleRepo.save(cycle);
    return cycle;
  }

  async status(cycleId: string) {
    const cycle = await this.cycleRepo.findOneByOrFail({ id: cycleId });
    const slots = await this.slotRepo.find({ where: { cycleId } });
    return { cycle, slots };
  }
}
