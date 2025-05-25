import { Ticket } from '@prisma/client';

export interface TicketResponseDto extends Ticket {
  sold: number;
}
