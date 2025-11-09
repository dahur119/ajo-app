import { GroupsService } from './groups.service';
import { Repository } from 'typeorm';
import { Group } from './entities/group.entity';
import { GroupMember } from './entities/group-member.entity';

describe('GroupsService', () => {
  let service: GroupsService;
  let groupRepo: Partial<Repository<Group>>;
  let memberRepo: Partial<Repository<GroupMember>>;

  beforeEach(() => {
    groupRepo = {
      create: jest.fn((dto) => ({ ...dto } as any)),
      save: jest.fn(async (g: any) => { g.id = 'g1'; return g; }),
    };
    memberRepo = {
      create: jest.fn((dto) => dto as any),
      save: jest.fn(async (m) => ({ id: 'm1', ...m } as any)),
      find: jest.fn(async ({ where: { groupId } }: any) => [{ id: 'm1', groupId, role: 'member' }] as any),
      findOneBy: jest.fn(async ({ id, groupId }: any) => ({ id, groupId, role: 'member' } as any)),
      delete: jest.fn(async () => ({ affected: 1 })),
    };
    service = new GroupsService(groupRepo as any, memberRepo as any);
  });

  it('creates group and adds owner as member', async () => {
    const result = await service.create({ name: 'Thrift Group', ownerUserId: 'u1' });
    expect(groupRepo.create).toHaveBeenCalledWith({ name: 'Thrift Group', ownerUserId: 'u1' });
    expect(groupRepo.save).toHaveBeenCalled();
    expect(memberRepo.save).toHaveBeenCalledWith(expect.objectContaining({ role: 'owner', userId: 'u1' }));
    expect(result.id).toBe('g1');
  });

  it('adds a member', async () => {
    const member = await service.addMember('g1', { userId: 'u2' });
    expect(memberRepo.save).toHaveBeenCalledWith(expect.objectContaining({ groupId: 'g1', userId: 'u2', role: 'member' }));
    expect(member.id).toBeDefined();
  });

  it('lists members', async () => {
    const list = await service.listMembers('g1');
    expect(memberRepo.find).toHaveBeenCalledWith({ where: { groupId: 'g1' } });
    expect(list.length).toBeGreaterThan(0);
  });

  it('updates a member role', async () => {
    const updated = await service.updateMember('g1', 'm1', { role: 'admin' });
    expect((memberRepo as any).findOneBy).toHaveBeenCalledWith({ id: 'm1', groupId: 'g1' });
    expect(updated.role).toBe('admin');
  });

  it('removes a non-owner member', async () => {
    const result = await service.removeMember('g1', 'm1');
    expect((memberRepo as any).findOneBy).toHaveBeenCalledWith({ id: 'm1', groupId: 'g1' });
    expect((memberRepo as any).delete).toHaveBeenCalledWith({ id: 'm1' });
    expect(result.success).toBe(true);
  });

  it('prevents removing owner', async () => {
    // Override findOneBy to return owner
    (memberRepo as any).findOneBy = jest.fn(async () => ({ id: 'm1', groupId: 'g1', role: 'owner' }));
    await expect(service.removeMember('g1', 'm1')).rejects.toThrow('Cannot remove the group owner');
  });
});