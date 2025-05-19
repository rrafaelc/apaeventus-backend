import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { TokenService } from 'src/token/token.service';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  imports: [DatabaseModule],
  controllers: [UserController],
  providers: [TokenService, UserService],
  exports: [UserService],
})
export class UserModule {}
