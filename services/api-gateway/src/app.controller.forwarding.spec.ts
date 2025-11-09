import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';

describe('AppController forwarding', () => {
  let controller: AppController;
  const httpServiceMock = {
    request: jest.fn(() => of({ status: 200, data: { ok: true } })),
  } as unknown as HttpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService, { provide: HttpService, useValue: httpServiceMock }],
    }).compile();

    controller = module.get<AppController>(AppController);
  });

  it('forwards user claims headers to transaction-service', async () => {
    const req: any = {
      method: 'GET',
      originalUrl: '/transactions/cycles/123/status',
      body: {},
      headers: {},
      user: { userId: 'u1', email: 't@example.com', emailVerified: true },
    };
    const res: any = {
      status: jest.fn(() => res),
      json: jest.fn(() => res),
    };

    await controller.proxyToTransactionService(req, res);
    expect((httpServiceMock.request as any)).toHaveBeenCalled();
    const call = (httpServiceMock.request as any).mock.calls[0][0];
    expect(call.headers['x-user-id']).toBe('u1');
    expect(call.headers['x-user-email']).toBe('t@example.com');
    expect(call.headers['x-email-verified']).toBe('true');
  });
});