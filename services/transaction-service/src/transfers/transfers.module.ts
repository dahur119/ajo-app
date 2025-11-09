import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletAccount } from './entities/wallet-account.entity';
import { LedgerEntry } from './entities/ledger-entry.entity';
import { Transfer } from './entities/transfer.entity';
import { TransfersService } from './transfers.service';
import { TransfersController } from './transfers.controller';

@Module({
  imports: [TypeOrmModule.forFeature([WalletAccount, LedgerEntry, Transfer])],
  controllers: [TransfersController],
  providers: [TransfersService],
  exports: [TransfersService],
})
export class TransfersModule {}