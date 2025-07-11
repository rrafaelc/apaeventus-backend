import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Ticket } from '@prisma/client';
import * as dayjs from 'dayjs';
import { AWSService } from 'src/aws/aws.service';
import { PrismaService } from 'src/database/prisma.service';
import { CountSoldDto } from './dtos/count-sold.dto';
import { CountUsedDto } from './dtos/count-used.dto';
import { CreateTicketDto } from './dtos/create-ticket.dto';
import { DeleteTicketDto } from './dtos/delete-ticket.dto';
import { EnableDisableTicketDto } from './dtos/enable-disable-ticket.dto';
import { FindAllDto } from './dtos/find-all.dto';
import { FindTicketByIdDto } from './dtos/find-ticket-by-id.dto';
import { TicketResponseDto } from './dtos/ticket-response.dto';
import { ITicketService } from './interfaces/ITicketService';

@Injectable()
export class TicketService implements ITicketService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly awsService: AWSService,
  ) {}

  async create(
    data: CreateTicketDto,
    imageFile?: Express.Multer.File,
  ): Promise<Ticket> {
    this.validationIsEventExpired(data.eventDate);

    let imageUrl: string | undefined;

    if (imageFile) {
      const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedMimeTypes.includes(imageFile.mimetype)) {
        throw new BadRequestException([
          'Invalid image format. Only JPEG and PNG are allowed',
        ]);
      }

      const maxSize = 10 * 1024 * 1024; // 10MB
      if (imageFile.size > maxSize) {
        throw new BadRequestException([
          'The image size must be less than 10MB',
        ]);
      }

      imageUrl = await this.awsService.uploadFileToS3(imageFile);
    }

    try {
      const ticket = await this.prisma.ticket.create({
        data: {
          ...data,
          eventDate: new Date(data.eventDate),
          quantity: Number(data.quantity),
          price: Number(data.price),
          ...(imageUrl && { imageUrl }),
        },
      });
      return ticket;
    } catch (error) {
      throw new InternalServerErrorException([error.message]);
    }
  }

  async findAll({ showInactive }: FindAllDto): Promise<TicketResponseDto[]> {
    const tickets = await this.prisma.ticket.findMany({
      where: {
        isActive: showInactive === 'true' ? undefined : true,
        isDeleted: false,
        eventDate: {
          gte: new Date(),
        },
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

  async findOne({ id }: FindTicketByIdDto): Promise<TicketResponseDto> {
    const ticket = await this.prisma.ticket.findUnique({
      where: {
        id,
        isDeleted: false,
      },
    });

    if (!ticket) throw new BadRequestException(['Ticket not found']);

    const sold = await this.prisma.ticketSale.count({
      where: { ticketId: ticket.id },
    });

    return { ...ticket, sold };
  }

  async enableDisableTicket({
    id,
    isActive,
  }: EnableDisableTicketDto): Promise<Ticket> {
    const ticketExists = await this.findOne({ id });

    if (!ticketExists) throw new BadRequestException(['Ticket not found']);

    const ticket = await this.prisma.ticket.update({
      where: { id },
      data: { isActive },
    });

    return ticket;
  }

  async countSold({ ticketId }: CountSoldDto): Promise<number> {
    const ticketExists = await this.findOne({ id: ticketId });

    if (!ticketExists) throw new BadRequestException(['Ticket not found']);

    return this.prisma.ticketSale.count({
      where: { ticketId },
    });
  }

  async countUsed({ ticketId }: CountUsedDto): Promise<number> {
    const ticketExists = await this.findOne({ id: ticketId });

    if (!ticketExists) throw new BadRequestException(['Ticket not found']);

    return this.prisma.ticketSale.count({
      where: {
        ticketId,
        used: true,
      },
    });
  }

  async delete({ id }: DeleteTicketDto): Promise<void> {
    const ticketExists = await this.findOne({ id });

    if (!ticketExists || ticketExists.isDeleted)
      throw new BadRequestException(['Ticket not found']);

    try {
      await this.prisma.ticket.update({
        where: { id },
        data: { isDeleted: true },
      });
    } catch (error) {
      throw new InternalServerErrorException([error.message]);
    }
  }

  private validationIsEventExpired(eventDate: string): void {
    try {
      const now = new Date();

      const oneDayFromNow = dayjs(now).add(1, 'day').toDate();

      if (new Date(eventDate) < oneDayFromNow) {
        throw new BadRequestException(
          'Event date must be at least 1 day in the future',
        );
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
