import { Module, forwardRef } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AWSModule } from 'src/aws/aws.module';
import { DatabaseModule } from 'src/database/database.module';
import { StripeModule } from 'src/stripe/stripe.module';
import { TicketModule } from 'src/ticket/ticket.module';
import { TokenService } from 'src/token/token.service';
import { RolesGuard } from 'src/user/guards/roles.guard';
import { UserService } from 'src/user/user.service';
import { SaleController } from './sale.controller';
import { SaleService } from './sale.service';

@Module({
  imports: [
    DatabaseModule,
    AWSModule,
    forwardRef(() => StripeModule),
    forwardRef(() => TicketModule),
  ],
  controllers: [SaleController],
  providers: [
    SaleService,
    TokenService,
    UserService,
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
  exports: [SaleService],
})
export class SaleModule {}
