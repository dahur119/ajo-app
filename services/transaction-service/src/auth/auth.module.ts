import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { JwtGuard } from './jwt.guard';
import { ProbeController } from './probe.controller';

@Module({
  imports: [PassportModule],
  controllers: [ProbeController],
  providers: [JwtStrategy, JwtGuard],
  exports: [PassportModule, JwtGuard],
})
export class AuthModule {}