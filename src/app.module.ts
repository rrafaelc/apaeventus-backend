import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { AWSModule } from './aws/aws.module';
import { DatabaseModule } from './database/database.module';
import { PrismaService } from './database/prisma.service';
import { SaleModule } from './sale/sale.module';
import { TicketModule } from './ticket/ticket.module';
import { TokenModule } from './token/token.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    AuthModule,
    UserModule,
    DatabaseModule,
    TokenModule,
    TicketModule,
    SaleModule,
    AWSModule,
  ],
  controllers: [],
  providers: [PrismaService],
})
export class AppModule {}
