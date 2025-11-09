import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { HttpModule } from '@nestjs/axios';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JwtStrategy } from './auth/jwt.strategy';
import { VerifiedEmailGuard } from './auth/verified-email.guard';
import { AuthGuard } from '@nestjs/passport';

@Module({
   imports: [
      HttpModule,
      PassportModule.register({ defaultStrategy: 'jwt' }),
      JwtModule.register({ secret: process.env.JWT_SECRET }),
   ],
   controllers: [AppController],
   providers: [
      AppService,
      JwtStrategy,
      // Apply JWT guard globally; the guard will use the registered default 'jwt' strategy
      { provide: APP_GUARD, useClass: (AuthGuard('jwt') as any) },
      VerifiedEmailGuard,
   ],
})
export class AppModule {}
