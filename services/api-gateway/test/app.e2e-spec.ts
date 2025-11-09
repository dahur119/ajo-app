import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    process.env.JWT_SECRET = 'test_jwt_secret';
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(HttpService)
      .useValue({
        request: jest.fn().mockImplementation((config) => {
          if (config.url.includes('/api/test')) {
            return of({
              status: 200,
              data: { message: 'API test successful' },
            });
          } else if (config.url.includes('/api/register')) {
            return of({
              status: 201,
              data: {
                user: {
                  id: 1,
                  name: 'Test User',
                  email: 'test@example.com',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                },
                token: 'mock_jwt_token',
              },
            });
          }
          return of({ status: 404, data: { error: 'Not found' } });
        }),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('/users/test (GET) - proxy to user-service', () => {
    return request(app.getHttpServer())
      .get('/users/test')
      .expect(200)
      .expect({ message: 'API test successful' });
  });

  it('/users/register (POST) - proxy to user-service', () => {
    const registerData = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      password_confirmation: 'password123',
    };
    return request(app.getHttpServer())
      .post('/users/register')
      .send(registerData)
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty('user');
        expect(res.body).toHaveProperty('token');
        expect(res.body.user.name).toBe('Test User');
        expect(res.body.user.email).toBe('test@example.com');
      });
  });
});
