import { Ticket } from '@prisma/client';
import { CreateTicketDto } from '../dtos/create-ticket.dto';

export interface ITicketService {
  create(createTicketDto: CreateTicketDto): Promise<Ticket>;
}
