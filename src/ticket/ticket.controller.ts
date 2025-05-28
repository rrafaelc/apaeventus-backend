import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Role, Ticket } from '@prisma/client';
import { Roles } from 'src/user/decorators/roles.decorator';
import { TicketResponseDto } from './dtos/ticket-response.dto';
import { CountSoldRequest } from './requests/count-sold.request';
import { CountUsedRequest } from './requests/count-used.request';
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

  @Get(':ticketId/count-sold')
  countSold(@Param() countSoldRequest: CountSoldRequest): Promise<number> {
    return this.ticketService.countSold(countSoldRequest);
  }

  @Get(':ticketId/count-used')
  countUsed(@Param() countUsedRequest: CountUsedRequest): Promise<number> {
    return this.ticketService.countUsed(countUsedRequest);
  }
}
