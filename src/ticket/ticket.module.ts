import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { DatabaseModule } from 'src/database/database.module';
import { TokenService } from 'src/token/token.service';
import { RolesGuard } from 'src/user/guards/roles.guard';
import { UserService } from 'src/user/user.service';
import { TicketController } from './ticket.controller';
import { TicketService } from './ticket.service';

@Module({
  imports: [DatabaseModule],
  providers: [
    TicketService,
    TokenService,
    UserService,
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
  controllers: [TicketController],
})
export class TicketModule {}
