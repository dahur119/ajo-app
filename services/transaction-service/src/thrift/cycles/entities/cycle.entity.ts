import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { Group } from '../../groups/entities/group.entity';
import { CycleSlot } from './cycle-slot.entity';

@Entity('cycles')
export class Cycle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  groupId: string;

  @ManyToOne(() => Group)
  group: Group;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: string;

  @Column({ length: 24 }) // e.g., 'weekly', 'monthly'
  frequency: string;

  @Column({ type: 'timestamptz', nullable: true })
  startAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  endAt: Date | null;

  @Column({ length: 24, default: 'draft' }) // draft|active|completed|cancelled
  status: string;

  @Column({ length: 24, default: 'fixed' }) // rotation strategy
  rotationStrategy: string;

  @OneToMany(() => CycleSlot, (s) => s.cycle, { cascade: true })
  slots: CycleSlot[];
}