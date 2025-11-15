import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { HttpModule } from '@nestjs/axios';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JwtStrategy } from './auth/jwt.strategy';
import { VerifiedEmailGuard } from './auth/verified-email.guard';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { RolesGuard } from './auth/roles.guard';

@Module({
   imports: [
      ConfigModule.forRoot({
         isGlobal: true,
         validationSchema: Joi.object({
           NODE_ENV: Joi.string().valid('development', 'test', 'production').optional(),
           PORT: Joi.number().integer().min(1).max(65535).default(3000),
           GLOBAL_PREFIX: Joi.string().default('api'),
           API_VERSION: Joi.alternatives().try(Joi.string(), Joi.number()).default('1'),
           JWT_SECRET: Joi.string().min(16).required(),
           LIVE_E2E: Joi.boolean().optional(),
           USER_BASE_URL: Joi.string().uri().required(),
           TXN_BASE_URL: Joi.string().uri().required(),
           INVESTMENT_BASE_URL: Joi.string().uri().required(),
           RATE_LIMIT_TTL: Joi.number().integer().min(1).default(60),
           RATE_LIMIT_LIMIT: Joi.number().integer().min(1).default(120),
           OUTBOUND_HTTP_TIMEOUT_MS: Joi.number().integer().min(100).default(4000),
           OUTBOUND_HTTP_MAX_RETRIES: Joi.number().integer().min(0).default(2),
           OUTBOUND_HTTP_RETRY_DELAY_MS: Joi.number().integer().min(0).default(200),
           CORS_ALLOWED_HEADERS: Joi.string().optional(),
           CORS_EXPOSED_HEADERS: Joi.string().optional(),
           CORS_METHODS: Joi.string().optional(),
           CORS_ORIGIN: Joi.string().optional(),
           ENABLE_HSTS: Joi.boolean().optional(),
         }),
         validationOptions: { allowUnknown: true, abortEarly: false },
      }),
      HttpModule.register({
         timeout: Number(process.env.OUTBOUND_HTTP_TIMEOUT_MS || 4000),
         maxRedirects: 5,
      }),
      ThrottlerModule.forRoot([
         {
           ttl: Number(process.env.RATE_LIMIT_TTL || 60) * 1000,
           limit: Number(process.env.RATE_LIMIT_LIMIT || 120),
         },
      ]),
      PassportModule.register({ defaultStrategy: 'jwt' }),
      JwtModule.register({}),
   ],
   controllers: [AppController],
   providers: [
      AppService,
      JwtStrategy,
      VerifiedEmailGuard,
      RolesGuard,
      { provide: APP_GUARD, useClass: ThrottlerGuard },
   ],
})
export class AppModule {}
