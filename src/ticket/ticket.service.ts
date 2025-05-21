import { BadRequestException, Injectable } from '@nestjs/common';
import * as dayjs from 'dayjs';
import { Ticket } from 'generated/prisma';
import { PrismaService } from 'src/database/prisma.service';
import { CreateTicketDto } from './dtos/create-ticket.dto';
import { ITicketService } from './interfaces/ITicketService';

@Injectable()
export class TicketService implements ITicketService {
  constructor(private readonly prisma: PrismaService) {}

  async create({
    title,
    description,
    imageUrl,
    expiresAt,
    quantity,
  }: CreateTicketDto): Promise<Ticket> {
    this.validationExpiresAt(expiresAt);

    const ticket = await this.prisma.ticket.create({
      data: {
        title,
        description,
        imageUrl,
        expiresAt,
        quantity,
      },
    });

    return ticket;
  }

  private validationExpiresAt(expiresAt: Date): void {
    const now = new Date();

    const oneDayFromNow = dayjs(now).add(1, 'day').toDate();

    if (new Date(expiresAt) < oneDayFromNow) {
      throw new BadRequestException(
        'Expiration date must be at least 1 day in the future',
      );
    }
  }
}
