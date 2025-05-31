import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { TokenModule } from 'src/token/token.module';
import { TokenService } from 'src/token/token.service';
import { UserModule } from 'src/user/user.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [DatabaseModule, TokenModule, UserModule],
  controllers: [AuthController],
  providers: [TokenService, AuthService],
  exports: [AuthService],
})
export class AuthModule {}
