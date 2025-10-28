import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { AWSModule } from './aws/aws.module';
import { ChatbotModule } from './chatbot/chatbot.module';
import { DatabaseModule } from './database/database.module';
import { PrismaService } from './database/prisma.service';
import { RecoverPasswordModule } from './recover-password/recover-password.module';
import { SaleModule } from './sale/sale.module';
import { StripeModule } from './stripe/stripe.module';
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
    RecoverPasswordModule,
    StripeModule,
    ChatbotModule,
  ],
  controllers: [],
  providers: [PrismaService],
})
export class AppModule {}
