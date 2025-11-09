import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CycleSlot } from '../../cycles/entities/cycle-slot.entity';
import { Cycle } from '../../cycles/entities/cycle.entity';
import { TransfersService } from '../../../transfers/transfers.service';
import { WalletAccount } from '../../../transfers/entities/wallet-account.entity';

@Injectable()
export class SchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SchedulerService.name);
  private transfers?: TransfersService;

  constructor(
    @InjectRepository(Cycle) private readonly cycleRepo: Repository<Cycle>,
    @InjectRepository(CycleSlot) private readonly slotRepo: Repository<CycleSlot>,
    private readonly moduleRef: ModuleRef,
  ) {}

  onModuleInit() {
    this.transfers = this.moduleRef.get(TransfersService, { strict: false });
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async processDueSlots() {
    const now = new Date();
    if (!this.transfers) {
      this.transfers = this.moduleRef.get(TransfersService, { strict: false });
      if (!this.transfers) {
        this.logger.error('TransfersService not available');
        return;
      }
    }
    const dueSlots = await this.slotRepo.find({ where: { status: 'pending' } });
    for (const slot of dueSlots) {
      if (slot.scheduledAt && slot.scheduledAt > now) continue;
      try {
        const cycle = await this.cycleRepo.findOne({ where: { id: slot.cycleId } });
        if (!cycle || cycle.status !== 'active') continue;

        // Ensure accounts
        const userAcct = await this.transfers.ensureUserWallet(slot.userId, 'NGN');
        const escrowAcct = await this.transfers.ensureGroupEscrow(cycle.groupId, 'NGN');

        const requestId = `cycle:${slot.cycleId}:slot:${slot.id}:${now.toISOString().slice(0,10)}`;
        const res = await this.transfers.create({
          requestId,
          fromAccountId: userAcct.id,
          toAccountId: escrowAcct.id,
          amount: String(cycle.amount),
          currency: 'NGN',
        });

        if (res.status === 'completed') {
          slot.status = 'contributed';
        } else {
          slot.status = 'missed';
        }
        await this.slotRepo.save(slot);
      } catch (e) {
        this.logger.error(`Failed processing slot ${slot.id}: ${e.message}`);
      }
    }
  }
}
