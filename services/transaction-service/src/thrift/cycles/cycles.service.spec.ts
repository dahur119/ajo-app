import { CyclesService } from './cycles.service';
import { Repository } from 'typeorm';
import { Cycle } from './entities/cycle.entity';
import { CycleSlot } from './entities/cycle-slot.entity';

describe('CyclesService', () => {
  let service: CyclesService;
  let cycleRepo: Partial<Repository<Cycle>>;
  let slotRepo: Partial<Repository<CycleSlot>>;

  beforeEach(() => {
    cycleRepo = {
      create: jest.fn((dto) => ({ id: 'c1', ...dto } as any)),
      save: jest.fn(async (c) => c as any),
      findOneByOrFail: jest.fn(async ({ id }) => ({ id, status: 'draft' } as any)),
    };
    slotRepo = {
      create: jest.fn((dto) => ({ id: `s${dto.order}`, ...dto } as any)),
      save: jest.fn(async (s) => s as any),
      find: jest.fn(async ({ where: { cycleId } }: any) => [{ id: 's1', cycleId }] as any),
    };
    service = new CyclesService(cycleRepo as any, slotRepo as any);
  });

  it('creates cycle and slots', async () => {
    const dto = {
      groupId: 'g1',
      amount: '100.00',
      frequency: 'weekly',
      slots: [
        { userId: 'u1', order: 1 },
        { userId: 'u2', order: 2 },
      ],
    };
    const result = await service.create(dto as any);
    expect(cycleRepo.create).toHaveBeenCalled();
    expect(cycleRepo.save).toHaveBeenCalled();
    expect(slotRepo.save).toHaveBeenCalled();
    expect(result.cycle.id).toBe('c1');
    expect(result.slots.length).toBe(2);
  });

  it('starts a cycle', async () => {
    const cycle = await service.start('c1');
    expect(cycleRepo.findOneByOrFail).toHaveBeenCalledWith({ id: 'c1' });
    expect(cycle.status).toBe('active');
  });

  it('returns cycle status with slots', async () => {
    const status = await service.status('c1');
    expect(status.cycle.id).toBe('c1');
    expect(status.slots.length).toBeGreaterThan(0);
  });
});