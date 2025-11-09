import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('transfers')
export class Transfer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ length: 120 })
  requestId: string;

  @Column({ type: 'uuid' })
  fromAccountId: string;

  @Column({ type: 'uuid' })
  toAccountId: string;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  amount: string;

  @Column({ length: 3, default: 'NGN' })
  currency: string;

  @Index()
  @Column({ length: 24, default: 'pending' })
  status: string; // pending|completed|failed

  @Column({ type: 'text', nullable: true })
  error: string | null;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}