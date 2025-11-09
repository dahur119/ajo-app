import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppController } from '../app.controller';
import { AppService } from '../app.service';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from '../auth/jwt.strategy';
import { VerifiedEmailGuard } from '../auth/verified-email.guard';
import jwt from 'jsonwebtoken';

describe('Gateway e2e smoke', () => {
  let app: INestApplication;
  const httpServiceMock = {
    request: jest.fn(() => of({ status: 200, data: { ok: true } })),
  } as unknown as HttpService;

  beforeAll(async () => {
    process.env.JWT_ALG = 'HS256';
    process.env.JWT_SECRET = 'test_secret';

    const moduleRef = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({ secret: process.env.JWT_SECRET }),
      ],
      controllers: [AppController],
      providers: [
        AppService,
        JwtStrategy,
        VerifiedEmailGuard,
        { provide: HttpService, useValue: httpServiceMock },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const signToken = (claims: any) => jwt.sign(claims, process.env.JWT_SECRET as string, { algorithm: 'HS256' });

  it('blocks unverified requests (403)', async () => {
    const token = signToken({ sub: 'u1', email: 't@example.com' });
    await request(app.getHttpServer())
      .get('/transactions/cycles/123/status')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('allows with header x-email-verified=true (200)', async () => {
    const token = signToken({ sub: 'u1', email: 't@example.com' });
    await request(app.getHttpServer())
      .get('/transactions/cycles/123/status')
      .set('Authorization', `Bearer ${token}`)
      .set('x-email-verified', 'true')
      .expect(200);
  });

  it('allows when claim email_verified_at exists (200)', async () => {
    const token = signToken({ sub: 'u1', email: 't@example.com', email_verified_at: new Date().toISOString() });
    await request(app.getHttpServer())
      .get('/transactions/cycles/123/status')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });
});