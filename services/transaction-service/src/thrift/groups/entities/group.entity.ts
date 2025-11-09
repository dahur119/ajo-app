import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { GroupMember } from './group-member.entity';

@Entity('groups')
export class Group {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 120 })
  name: string;

  // userId from user-service (JWT subject)
  @Column({ type: 'uuid' })
  ownerUserId: string;

  @OneToMany(() => GroupMember, (m) => m.group, { cascade: true })
  members: GroupMember[];

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}