import { Module } from '@nestjs/common';
import { TokenModule } from 'src/token/token.module';
import { TokenService } from 'src/token/token.service';
import { UserModule } from 'src/user/user.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [TokenModule, UserModule],
  controllers: [AuthController],
  providers: [TokenService, AuthService],
  exports: [AuthService],
})
export class AuthModule {}
