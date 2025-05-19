import { Module } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { TokenModule } from 'src/token/token.module';
import { TokenService } from 'src/token/token.service';
import { UserModule } from 'src/user/user.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [TokenModule, UserModule],
  controllers: [AuthController],
  providers: [TokenService, AuthService, PrismaService],
  exports: [AuthService],
})
export class AuthModule {}
