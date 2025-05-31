import {
  Body,
  Controller,
  Get,
  Param,
  Post,
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
import { EnableDisableTicketRequest } from './requests/enable-disable-ticket.request';
import { FindTicketByIdRequest } from './requests/find-ticket-by-id.request';
import { TicketService } from './ticket.service';

@Controller('ticket')
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  @Get()
  findAll(): Promise<TicketResponseDto[]> {
    return this.ticketService.findAll();
  }

  @Get(':id')
  findOne(@Param() { id }: FindTicketByIdRequest): Promise<TicketResponseDto> {
    return this.ticketService.findOne({ id });
  }

  @Roles(Role.ADMIN)
  @Post()
  @UseInterceptors(FileInterceptor('imageFile'))
  create(
    @Body() createTicketRequest: CreateTicketRequest,
    @UploadedFile() imageFile?: Express.Multer.File,
  ) {
    return this.ticketService.create(createTicketRequest, imageFile);
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
}
