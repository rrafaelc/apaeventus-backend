import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { DatabaseModule } from 'src/database/database.module';
import { TicketService } from 'src/ticket/ticket.service';
import { TokenService } from 'src/token/token.service';
import { RolesGuard } from 'src/user/guards/roles.guard';
import { UserService } from 'src/user/user.service';
import { SaleController } from './sale.controller';
import { SaleService } from './sale.service';

@Module({
  imports: [DatabaseModule],
  controllers: [SaleController],
  providers: [
    TicketService,
    SaleService,
    TokenService,
    UserService,
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class SaleModule {}
