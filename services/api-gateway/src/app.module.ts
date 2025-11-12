import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JwtStrategy } from './auth/jwt.strategy';
import { VerifiedEmailGuard } from './auth/verified-email.guard';

@Module({
   imports: [
      ConfigModule.forRoot({
         isGlobal: true,
      }),
      HttpModule,
      PassportModule.register({ defaultStrategy: 'jwt' }),
      JwtModule.register({}),
   ],
   controllers: [AppController],
   providers: [
      AppService,
      JwtStrategy,
      VerifiedEmailGuard,
   ],
})
export class AppModule {}
