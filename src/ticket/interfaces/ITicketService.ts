import { Ticket } from '@prisma/client';
import { CreateTicketDto } from '../dtos/create-ticket.dto';
import { EnableDisableTicketDto } from '../dtos/enable-disable-ticket.dto';

export interface ITicketService {
  create(createTicketDto: CreateTicketDto): Promise<Ticket>;
  findAll(): Promise<Ticket[]>;
  findById(id: number): Promise<Ticket | null>;
  enableDisableTicket(
    enableDisableTicketDto: EnableDisableTicketDto,
  ): Promise<Ticket>;
}
