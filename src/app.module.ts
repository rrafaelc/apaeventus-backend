import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { PrismaService } from './database/prisma.service';
import { UserModule } from './user/user.module';
import { TokenModule } from './token/token.module';

@Module({
  imports: [AuthModule, UserModule, DatabaseModule, TokenModule],
  controllers: [],
  providers: [PrismaService],
})
export class AppModule {}
