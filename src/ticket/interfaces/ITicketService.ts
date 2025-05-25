import { Ticket } from '@prisma/client';
import { CreateTicketDto } from '../dtos/create-ticket.dto';
import { EnableDisableTicketDto } from '../dtos/enable-disable-ticket.dto';
import { TicketResponseDto } from '../dtos/ticket-response.dto';

export interface ITicketService {
  create(createTicketDto: CreateTicketDto): Promise<Ticket>;
  findAll(): Promise<TicketResponseDto[]>;
  findById(id: number): Promise<Ticket | null>;
  enableDisableTicket(
    enableDisableTicketDto: EnableDisableTicketDto,
  ): Promise<Ticket>;
  countSold(ticketId: number): Promise<number>;
  countUsed(ticketId: number): Promise<number>;
}
