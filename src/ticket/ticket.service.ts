import { BadRequestException, Injectable } from '@nestjs/common';
import { Ticket } from '@prisma/client';
import * as dayjs from 'dayjs';
import { PrismaService } from 'src/database/prisma.service';
import { CreateTicketDto } from './dtos/create-ticket.dto';
import { EnableDisableTicketDto } from './dtos/enable-disable-ticket.dto';
import { ITicketService } from './interfaces/ITicketService';

@Injectable()
export class TicketService implements ITicketService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateTicketDto): Promise<Ticket> {
    this.validationExpiresAt(data.expiresAt);

    const ticket = await this.prisma.ticket.create({ data });

    return ticket;
  }

  async findAll(): Promise<Ticket[]> {
    return this.prisma.ticket.findMany({
      where: {
        isActive: true,
      },
    });
  }

  async findById(id: number): Promise<Ticket | null> {
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

  async countSold(ticketId: number): Promise<number> {
    const ticketExists = await this.findById(ticketId);

    if (!ticketExists) throw new BadRequestException(['Ticket not found']);

    return this.prisma.ticketSale.count({
      where: { ticketId },
    });
  }

  async countUsed(ticketId: number): Promise<number> {
    const ticketExists = await this.findById(ticketId);

    if (!ticketExists) throw new BadRequestException(['Ticket not found']);

    return this.prisma.ticketSale.count({
      where: {
        ticketId,
        used: true,
      },
    });
  }

  private validationExpiresAt(expiresAt: string): void {
    try {
      const now = new Date();

      const oneDayFromNow = dayjs(now).add(1, 'day').toDate();

      if (new Date(expiresAt) < oneDayFromNow) {
        throw new BadRequestException([
          'Expiration date must be at least 1 day in the future',
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
