import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HttpService } from '@nestjs/axios';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        { provide: HttpService, useValue: { request: jest.fn() } },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return message and user claims', () => {
      const result = appController.getHello({ user: { userId: 'u1' } } as any);
      expect(result.message).toBe('Hello World!');
      expect(result.user.userId).toBe('u1');
    });
  });
});
