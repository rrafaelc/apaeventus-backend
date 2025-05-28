import { BadRequestException, Injectable } from '@nestjs/common';
import { Ticket } from '@prisma/client';
import * as dayjs from 'dayjs';
import { PrismaService } from 'src/database/prisma.service';
import { CountSoldDto } from './dtos/count-sold.dto';
import { CountUsedDto } from './dtos/count-used.dto';
import { CreateTicketDto } from './dtos/create-ticket.dto';
import { EnableDisableTicketDto } from './dtos/enable-disable-ticket.dto';
import { TicketResponseDto } from './dtos/ticket-response.dto';
import { ITicketService } from './interfaces/ITicketService';

@Injectable()
export class TicketService implements ITicketService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateTicketDto): Promise<Ticket> {
    this.validationIsEventExpired(data.eventDate);

    const ticket = await this.prisma.ticket.create({ data });

    return ticket;
  }

  async findAll(): Promise<TicketResponseDto[]> {
    const tickets = await this.prisma.ticket.findMany({
      where: {
        isActive: true,
      },
    });

    // For each ticket, count the number of sold tickets
    const ticketsWithSold = await Promise.all(
      tickets.map(async (ticket) => {
        const sold = await this.prisma.ticketSale.count({
          where: { ticketId: ticket.id },
        });
        return { ...ticket, sold };
      }),
    );

    return ticketsWithSold
      .filter((ticket) => ticket.quantity > ticket.sold)
      .sort((a, b) => b.sold - a.sold);
  }

  async findById(id: string): Promise<Ticket | null> {
    return this.prisma.ticket.findUnique({
      where: { id },
    });
  }

  async enableDisableTicket({
    id,
    isActive,
  }: EnableDisableTicketDto): Promise<Ticket> {
    const ticketExists = await this.findById(id);

    if (!ticketExists) throw new BadRequestException(['Ticket not found']);

    const ticket = await this.prisma.ticket.update({
      where: { id },
      data: { isActive },
    });

    return ticket;
  }

  async countSold({ ticketId }: CountSoldDto): Promise<number> {
    const ticketExists = await this.findById(ticketId);

    if (!ticketExists) throw new BadRequestException(['Ticket not found']);

    return this.prisma.ticketSale.count({
      where: { ticketId },
    });
  }

  async countUsed({ ticketId }: CountUsedDto): Promise<number> {
    const ticketExists = await this.findById(ticketId);

    if (!ticketExists) throw new BadRequestException(['Ticket not found']);

    return this.prisma.ticketSale.count({
      where: {
        ticketId,
        used: true,
      },
    });
  }

  private validationIsEventExpired(eventDate: string): void {
    try {
      const now = new Date();

      const oneDayFromNow = dayjs(now).add(1, 'day').toDate();

      if (new Date(eventDate) < oneDayFromNow) {
        throw new BadRequestException([
          'Event date must be at least 1 day in the future',
        ]);
      }
    } catch (error) {
      throw new BadRequestException([
        typeof error === 'object' && error !== null && 'message' in error
          ? (error as { message: string }).message
          : 'Invalid expiration date',
      ]);
    }
  }
}
