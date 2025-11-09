import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Unique } from 'typeorm';
import { Cycle } from './cycle.entity';

@Entity('cycle_slots')
@Unique(['cycleId', 'order'])
export class CycleSlot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  cycleId: string;

  @ManyToOne(() => Cycle, (c) => c.slots)
  cycle: Cycle;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'int' })
  order: number;

  @Column({ type: 'timestamptz', nullable: true })
  scheduledAt: Date | null;

  @Column({ length: 24, default: 'pending' }) // pending|contributed|missed|paid_out
  status: string;
}