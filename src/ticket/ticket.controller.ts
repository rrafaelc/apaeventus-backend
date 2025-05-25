import { Body, Controller, Post } from '@nestjs/common';
import { Role, Ticket } from '@prisma/client';
import { Roles } from 'src/user/decorators/roles.decorator';
import { CreateTicketRequest } from './requests/create-ticket-request';
import { TicketService } from './ticket.service';

@Controller('ticket')
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  @Roles(Role.ADMIN)
  @Post()
  create(@Body() createTicketRequest: CreateTicketRequest): Promise<Ticket> {
    return this.ticketService.create(createTicketRequest);
  }
}
