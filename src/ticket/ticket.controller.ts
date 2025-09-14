import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role, Ticket } from '@prisma/client';
import { Roles } from 'src/user/decorators/roles.decorator';
import { TicketResponseDto } from './dtos/ticket-response.dto';
import { CountSoldRequest } from './requests/count-sold.request';
import { CountUsedRequest } from './requests/count-used.request';
import { CreateTicketRequest } from './requests/create-ticket.request';
import { DeleteTicketRequest } from './requests/delete-ticket.request';
import { EnableDisableTicketRequest } from './requests/enable-disable-ticket.request';
import { FindAllRequest } from './requests/find-all.request';
import { FindTicketByIdRequest } from './requests/find-ticket-by-id.request';
import { TicketService } from './ticket.service';

@Controller('ticket')
export class TicketController {
  private readonly logger = new Logger(TicketController.name);

  constructor(private readonly ticketService: TicketService) {}

  @Get()
  async findAll(
    @Query()
    findAllRequest: FindAllRequest,
  ): Promise<TicketResponseDto[]> {
    this.logger.log('Fetching all tickets');

    try {
      const result = await this.ticketService.findAll(findAllRequest);
      this.logger.log(`Found ${result.length} tickets`);
      return result;
    } catch (error) {
      this.logger.error('Failed to fetch tickets', error.stack);
      throw error;
    }
  }

  @Get(':id')
  async findOne(
    @Param() { id }: FindTicketByIdRequest,
  ): Promise<TicketResponseDto> {
    this.logger.log(`Fetching ticket with ID: ${id}`);

    try {
      const result = await this.ticketService.findOne({ id });
      this.logger.log(`Ticket found: ${result.title} (ID: ${id})`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch ticket with ID: ${id}`, error.stack);
      throw error;
    }
  }

  @Roles(Role.ADMIN)
  @Post()
  @UseInterceptors(FileInterceptor('imageFile'))
  async create(
    @Body() createTicketRequest: CreateTicketRequest,
    @UploadedFile() imageFile?: Express.Multer.File,
  ) {
    this.logger.log(`Creating ticket: ${createTicketRequest.title}`);
    this.logger.debug(`Image file provided: ${!!imageFile}`);

    try {
      const result = await this.ticketService.create(
        createTicketRequest,
        imageFile,
      );
      this.logger.log(
        `Ticket created successfully: ${result.title} (ID: ${result.id})`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to create ticket: ${createTicketRequest.title}`,
        error.stack,
      );
      throw error;
    }
  }

  @Roles(Role.ADMIN)
  @Post('enable-disable')
  enableDisableTicket(
    @Body() enableDisableTicketRequest: EnableDisableTicketRequest,
  ): Promise<Ticket> {
    return this.ticketService.enableDisableTicket(enableDisableTicketRequest);
  }

  @Roles(Role.ADMIN)
  @Get(':ticketId/count-sold')
  countSold(@Param() countSoldRequest: CountSoldRequest): Promise<number> {
    return this.ticketService.countSold(countSoldRequest);
  }

  @Roles(Role.ADMIN)
  @Get(':ticketId/count-used')
  countUsed(@Param() countUsedRequest: CountUsedRequest): Promise<number> {
    return this.ticketService.countUsed(countUsedRequest);
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  async delete(
    @Param() deleteTicketRequest: DeleteTicketRequest,
  ): Promise<void> {
    this.logger.log(`Deleting ticket with ID: ${deleteTicketRequest.id}`);

    try {
      await this.ticketService.delete(deleteTicketRequest);
      this.logger.log(`Ticket deleted successfully: ${deleteTicketRequest.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete ticket: ${deleteTicketRequest.id}`,
        error.stack,
      );
      throw error;
    }
  }
}
