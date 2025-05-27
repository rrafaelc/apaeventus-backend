import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Role, Ticket } from '@prisma/client';
import { Roles } from 'src/user/decorators/roles.decorator';
import { TicketResponseDto } from './dtos/ticket-response.dto';
import { EnableDisableTicketRequest } from './requests/enable-disable-ticket.request';
import { TicketService } from './ticket.service';

@Controller('ticket')
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  @Get()
  findAll(): Promise<TicketResponseDto[]> {
    return this.ticketService.findAll();
  }

  @Roles(Role.ADMIN)
  @Post('enable-disable')
  enableDisableTicket(
    @Body() enableDisableTicketRequest: EnableDisableTicketRequest,
  ): Promise<Ticket> {
    return this.ticketService.enableDisableTicket(enableDisableTicketRequest);
  }

  @Roles(Role.ADMIN)
  @Get(':id/count-sold')
  countSold(@Param('id') id: string): Promise<number> {
    return this.ticketService.countSold(id);
  }

  @Roles(Role.ADMIN)
  @Get(':id/count-used')
  countUsed(@Param('id') id: string): Promise<number> {
    return this.ticketService.countUsed(id);
  }
}
