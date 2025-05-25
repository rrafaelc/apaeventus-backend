import { Body, Controller, Get, Post } from '@nestjs/common';
import { Role, Ticket } from '@prisma/client';
import { Roles } from 'src/user/decorators/roles.decorator';
import { EnableDisableTicketRequest } from './requests/enable-disable-ticket.request';
import { TicketService } from './ticket.service';

@Controller('ticket')
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  @Get()
  findAll(): Promise<Ticket[]> {
    return this.ticketService.findAll();
  }

  @Roles(Role.ADMIN)
  @Post('enable-disable')
  enableDisableTicket(
    @Body() enableDisableTicketRequest: EnableDisableTicketRequest,
  ): Promise<Ticket> {
    return this.ticketService.enableDisableTicket(enableDisableTicketRequest);
  }
}
