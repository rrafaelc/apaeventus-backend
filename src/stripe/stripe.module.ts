import { Module, forwardRef } from '@nestjs/common';
import { AWSModule } from 'src/aws/aws.module';
import { DatabaseModule } from 'src/database/database.module';
import { SaleModule } from 'src/sale/sale.module';
import { TicketService } from 'src/ticket/ticket.service';
import { TokenService } from 'src/token/token.service';
import { UserService } from 'src/user/user.service';
import { StripeController } from './stripe.controller';
import { StripeService } from './stripe.service';

@Module({
  imports: [DatabaseModule, AWSModule, forwardRef(() => SaleModule)],
  controllers: [StripeController],
  providers: [StripeService, TicketService, UserService, TokenService],
  exports: [StripeService],
})
export class StripeModule {}
