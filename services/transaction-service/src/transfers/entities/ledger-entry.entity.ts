import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('ledger_entries')
export class LedgerEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ length: 120 })
  requestId: string;

  @Column({ type: 'uuid' })
  debitAccountId: string;

  @Column({ type: 'uuid' })
  creditAccountId: string;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  amount: string;

  @Column({ length: 3, default: 'NGN' })
  currency: string;

  @Column({ type: 'jsonb', nullable: true })
  meta: any;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}