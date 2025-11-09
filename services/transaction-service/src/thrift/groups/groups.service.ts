import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Group } from './entities/group.entity';
import { GroupMember } from './entities/group-member.entity';

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group) private readonly groupRepo: Repository<Group>,
    @InjectRepository(GroupMember) private readonly memberRepo: Repository<GroupMember>,
  ) {}

  async create(dto: { name: string; ownerUserId: string }) {
    const group = this.groupRepo.create(dto);
    await this.groupRepo.save(group);
    await this.memberRepo.save(this.memberRepo.create({
      groupId: group.id,
      userId: dto.ownerUserId,
      role: 'owner',
    }));
    return group;
  }

  async addMember(groupId: string, dto: { userId: string; role?: string }) {
    const member = this.memberRepo.create({
      groupId,
      userId: dto.userId,
      role: dto.role ?? 'member',
    });
    return this.memberRepo.save(member);
  }

  async listMembers(groupId: string) {
    return this.memberRepo.find({ where: { groupId } });
  }

  async updateMember(
    groupId: string,
    memberId: string,
    dto: { role?: string },
  ) {
    const member = await (this.memberRepo as any).findOneBy?.({ id: memberId, groupId });
    if (!member) {
      throw new Error('Member not found');
    }
    if (dto.role) {
      member.role = dto.role;
    }
    return this.memberRepo.save(member as any);
  }

  async removeMember(groupId: string, memberId: string) {
    const member = await (this.memberRepo as any).findOneBy?.({ id: memberId, groupId });
    if (!member) {
      throw new Error('Member not found');
    }
    if (member.role === 'owner') {
      throw new Error('Cannot remove the group owner');
    }
    await this.memberRepo.delete({ id: memberId } as any);
    return { success: true };
  }
}
