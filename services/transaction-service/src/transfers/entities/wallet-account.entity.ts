import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('wallet_accounts')
export class WalletAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  groupId: string | null;

  @Index()
  @Column({ length: 24 })
  type: string; // e.g., 'wallet', 'group_escrow'

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  balance: string;

  @Column({ length: 3, default: 'NGN' })
  currency: string;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}