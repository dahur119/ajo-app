import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { WalletAccount } from './entities/wallet-account.entity';
import { LedgerEntry } from './entities/ledger-entry.entity';
import { Transfer } from './entities/transfer.entity';

export interface CreateTransferDto {
  requestId: string;
  fromAccountId: string;
  toAccountId: string;
  amount: string; // decimal as string
  currency?: string;
}

@Injectable()
export class TransfersService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(WalletAccount) private readonly accountRepo: Repository<WalletAccount>,
    @InjectRepository(Transfer) private readonly transferRepo: Repository<Transfer>,
    @InjectRepository(LedgerEntry) private readonly ledgerRepo: Repository<LedgerEntry>,
  ) {}

  async ensureUserWallet(userId: string, currency = 'NGN') {
    let acct = await this.accountRepo.findOne({ where: { userId, type: 'wallet', currency } });
    if (!acct) {
      acct = this.accountRepo.create({ userId, groupId: null, type: 'wallet', balance: '0.00', currency });
      acct = await this.accountRepo.save(acct);
    }
    return acct;
  }

  async ensureGroupEscrow(groupId: string, currency = 'NGN') {
    let acct = await this.accountRepo.findOne({ where: { groupId, type: 'group_escrow', currency } });
    if (!acct) {
      acct = this.accountRepo.create({ userId: null, groupId, type: 'group_escrow', balance: '0.00', currency });
      acct = await this.accountRepo.save(acct);
    }
    return acct;
  }

  async create(dto: CreateTransferDto) {
    const existing = await this.transferRepo.findOne({ where: { requestId: dto.requestId } });
    if (existing) return existing;

    return this.dataSource.transaction(async (manager) => {
      const transfer = manager.create(Transfer, {
        requestId: dto.requestId,
        fromAccountId: dto.fromAccountId,
        toAccountId: dto.toAccountId,
        amount: dto.amount,
        currency: dto.currency ?? 'NGN',
        status: 'pending',
      });
      await manager.save(Transfer, transfer);

      const from = await manager.findOneOrFail(WalletAccount, { where: { id: dto.fromAccountId } });
      const to = await manager.findOneOrFail(WalletAccount, { where: { id: dto.toAccountId } });

      const amountNum = Number(dto.amount);
      const fromBal = Number(from.balance);
      if (fromBal < amountNum) {
        transfer.status = 'failed';
        transfer.error = 'Insufficient funds';
        await manager.save(Transfer, transfer);
        return transfer;
      }

      // Post ledger entries
      const debit = manager.create(LedgerEntry, {
        requestId: dto.requestId,
        debitAccountId: from.id,
        creditAccountId: to.id,
        amount: dto.amount,
        currency: transfer.currency,
      });
      await manager.save(LedgerEntry, debit);

      // Update balances
      from.balance = (fromBal - amountNum).toFixed(2);
      to.balance = (Number(to.balance) + amountNum).toFixed(2);
      await manager.save(WalletAccount, from);
      await manager.save(WalletAccount, to);

      transfer.status = 'completed';
      await manager.save(Transfer, transfer);
      return transfer;
    });
  }
}