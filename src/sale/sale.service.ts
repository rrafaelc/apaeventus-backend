import { BadRequestException, Injectable } from '@nestjs/common';
import { Role, TicketSale } from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';
import { TicketService } from 'src/ticket/ticket.service';
import { UserService } from 'src/user/user.service';
import { CreateSaleDto } from './dtos/create-sale.dto';
import { ISaleService } from './interfaces/ISaleService';

@Injectable()
export class SaleService implements ISaleService {
  constructor(
    private readonly ticketService: TicketService,
    private readonly userService: UserService,
    private readonly prisma: PrismaService,
  ) {}

  async create({
    ticketId,
    sellerId,
    customerId,
  }: CreateSaleDto): Promise<TicketSale> {
    const ticket = await this.ticketService.findById(ticketId);
    if (!ticket) throw new BadRequestException(['Ticket not found']);

    const customer = await this.userService.findById(customerId);
    if (!customer) throw new BadRequestException(['Customer not found']);
    if (customer.role !== Role.CUSTOMER)
      throw new BadRequestException(['Customer must be a customer']);

    const ticketSold = await this.ticketService.countSold(ticketId);

    if (ticketSold >= ticket.quantity)
      throw new BadRequestException(['Ticket all sold out']);

    const sale = await this.prisma.ticketSale.create({
      data: {
        ticketId,
        sellerId,
        customerId,
      },
    });

    return sale;
  }
}
