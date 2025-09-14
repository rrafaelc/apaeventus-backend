import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Ticket } from '@prisma/client';
import * as dayjs from 'dayjs';
import * as utc from 'dayjs/plugin/utc';
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

dayjs.extend(utc);

@Injectable()
export class TicketService implements ITicketService {
  private readonly logger = new Logger(TicketService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly awsService: AWSService,
  ) {}

  async create(
    data: CreateTicketDto,
    imageFile?: Express.Multer.File,
  ): Promise<Ticket> {
    this.logger.debug(`Creating ticket: ${data.title}`);
    this.logger.debug(`Event date: ${data.eventDate}`);
    this.logger.debug(`Quantity: ${data.quantity}, Price: ${data.price}`);

    this.validationIsEventExpired(data.eventDate);

    let imageUrl: string | undefined;

    if (imageFile) {
      this.logger.debug(`Processing image file: ${imageFile.originalname}`);
      const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedMimeTypes.includes(imageFile.mimetype)) {
        this.logger.warn(`Invalid image format: ${imageFile.mimetype}`);
        throw new BadRequestException([
          'Invalid image format. Only JPEG and PNG are allowed',
        ]);
      }

      const maxSize = 10 * 1024 * 1024; // 10MB
      if (imageFile.size > maxSize) {
        this.logger.warn(`Image size too large: ${imageFile.size} bytes`);
        throw new BadRequestException([
          'The image size must be less than 10MB',
        ]);
      }

      this.logger.debug('Uploading image to S3');
      imageUrl = await this.awsService.uploadFileToS3(imageFile);
      this.logger.debug(`Image uploaded successfully: ${imageUrl}`);
    }

    try {
      this.logger.debug('Creating ticket in database');

      // Convertemos a data do horário de Brasília para UTC antes de salvar
      const brasiliaOffset = -3;
      const eventDateBrasilia = dayjs(data.eventDate);
      const eventDateUtc = eventDateBrasilia
        .utc()
        .subtract(brasiliaOffset, 'hours')
        .toDate();

      this.logger.debug(
        `Event date to be saved (UTC): ${eventDateUtc.toISOString()}`,
      );

      const ticket = await this.prisma.ticket.create({
        data: {
          ...data,
          eventDate: eventDateUtc,
          quantity: Number(data.quantity),
          price: Number(data.price),
          ...(imageUrl && { imageUrl }),
        },
      });

      this.logger.log(
        `Ticket created successfully: ${ticket.title} (ID: ${ticket.id})`,
      );
      return ticket;
    } catch (error) {
      this.logger.error(`Failed to create ticket: ${data.title}`, error.stack);
      throw new InternalServerErrorException([error.message]);
    }
  }

  async findAll({ showInactive }: FindAllDto): Promise<TicketResponseDto[]> {
    this.logger.debug(`Finding all tickets, showInactive: ${showInactive}`);

    const tickets = await this.prisma.ticket.findMany({
      where: {
        isActive: showInactive === 'true' ? undefined : true,
        isDeleted: false,
        eventDate: {
          gte: new Date(),
        },
      },
    });

    this.logger.debug(`Found ${tickets.length} tickets from database`);

    // For each ticket, count the number of sold tickets
    this.logger.debug('Calculating sold count for each ticket');
    const ticketsWithSold = await Promise.all(
      tickets.map(async (ticket) => {
        const sold = await this.prisma.ticketSale.count({
          where: { ticketId: ticket.id },
        });
        return { ...ticket, sold };
      }),
    );

    const availableTickets = ticketsWithSold
      .filter((ticket) => ticket.quantity > ticket.sold)
      .sort((a, b) => b.sold - a.sold);

    this.logger.log(`Returning ${availableTickets.length} available tickets`);

    return availableTickets;
  }

  async findOne({ id }: FindTicketByIdDto): Promise<TicketResponseDto> {
    this.logger.debug(`Finding ticket by ID: ${id}`);

    const ticket = await this.prisma.ticket.findUnique({
      where: {
        id,
        isDeleted: false,
      },
    });

    if (!ticket) {
      this.logger.warn(`Ticket not found with ID: ${id}`);
      throw new BadRequestException(['Ticket not found']);
    }

    this.logger.debug(`Calculating sold count for ticket: ${ticket.title}`);
    const sold = await this.prisma.ticketSale.count({
      where: { ticketId: ticket.id },
    });

    this.logger.debug(`Ticket found: ${ticket.title}, sold: ${sold}`);
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
    this.logger.debug(`Deleting ticket with ID: ${id}`);

    const ticketExists = await this.findOne({ id });

    if (!ticketExists || ticketExists.isDeleted) {
      this.logger.warn(
        `Ticket deletion failed: Ticket not found with ID: ${id}`,
      );
      throw new BadRequestException(['Ticket not found']);
    }

    try {
      this.logger.debug(`Marking ticket as deleted: ${ticketExists.title}`);
      await this.prisma.ticket.update({
        where: { id },
        data: { isDeleted: true },
      });

      this.logger.log(
        `Ticket deleted successfully: ${ticketExists.title} (ID: ${id})`,
      );
    } catch (error) {
      this.logger.error(`Failed to delete ticket with ID: ${id}`, error.stack);
      throw new InternalServerErrorException([error.message]);
    }
  }

  private validationIsEventExpired(eventDate: string): void {
    try {
      // Assumindo que a data vem do frontend no horário do Brasil (UTC-3)
      // Convertemos para UTC para fazer a comparação consistente
      const brasiliaOffset = -3; // Brasil está UTC-3
      const nowUtc = dayjs().utc();
      const oneDayFromNowUtc = nowUtc.add(1, 'day');

      // Interpretamos a data como horário de Brasília e convertemos para UTC
      const eventDateBrasilia = dayjs(eventDate);
      const eventDateUtc = eventDateBrasilia
        .utc()
        .subtract(brasiliaOffset, 'hours');

      this.logger.debug(`Current UTC time: ${nowUtc.format()}`);
      this.logger.debug(`Event date from frontend (Brasília): ${eventDate}`);
      this.logger.debug(
        `Event date converted to UTC: ${eventDateUtc.format()}`,
      );
      this.logger.debug(
        `Minimum required date (UTC): ${oneDayFromNowUtc.format()}`,
      );

      if (eventDateUtc.isBefore(oneDayFromNowUtc)) {
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
