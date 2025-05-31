import { Ticket } from '@prisma/client';
import { CountSoldDto } from '../dtos/count-sold.dto';
import { CountUsedDto } from '../dtos/count-used.dto';
import { CreateTicketDto } from '../dtos/create-ticket.dto';
import { EnableDisableTicketDto } from '../dtos/enable-disable-ticket.dto';
import { FindAllDto } from '../dtos/find-all.dto';
import { FindTicketByIdDto } from '../dtos/find-ticket-by-id.dto';
import { TicketResponseDto } from '../dtos/ticket-response.dto';

export interface ITicketService {
  create(
    createTicketDto: CreateTicketDto,
    imageFile?: Express.Multer.File,
  ): Promise<Ticket>;
  findAll(findAllDto: FindAllDto): Promise<TicketResponseDto[]>;
  findOne(findTicketByIdDto: FindTicketByIdDto): Promise<TicketResponseDto>;
  enableDisableTicket(
    enableDisableTicketDto: EnableDisableTicketDto,
  ): Promise<Ticket>;
  countSold(countSoldDto: CountSoldDto): Promise<number>;
  countUsed(countUsedDto: CountUsedDto): Promise<number>;
}
