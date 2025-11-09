import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ThriftModule } from './thrift/thrift.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Group } from './thrift/groups/entities/group.entity';
import { GroupMember } from './thrift/groups/entities/group-member.entity';
import { Cycle } from './thrift/cycles/entities/cycle.entity';
import { CycleSlot } from './thrift/cycles/entities/cycle-slot.entity';
import { WalletAccount } from './transfers/entities/wallet-account.entity';
import { LedgerEntry } from './transfers/entities/ledger-entry.entity';
import { Transfer } from './transfers/entities/transfer.entity';
import { TransfersModule } from './transfers/transfers.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: (process.env.DB_TYPE as any) || 'postgres',
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT || 5432),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'transaction_service',
      entities: [Group, GroupMember, Cycle, CycleSlot, WalletAccount, LedgerEntry, Transfer],
      synchronize: false,
      logging: false,
    }),
    ThriftModule,
    TransfersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
