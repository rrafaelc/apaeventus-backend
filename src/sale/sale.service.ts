import { BadRequestException, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { writeFileSync } from 'fs';
import * as QRCode from 'qrcode';
import { PrismaService } from 'src/database/prisma.service';
import { TicketService } from 'src/ticket/ticket.service';
import { UserService } from 'src/user/user.service';
import { CreateSaleDto } from './dtos/create-sale.dto';
import { ISaleService } from './interfaces/ISaleService';
import { generatePdf } from './utils/generatePdf';

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
    quantity,
  }: CreateSaleDto): Promise<void> {
    const ticket = await this.ticketService.findById(ticketId);
    if (!ticket) throw new BadRequestException(['Ticket not found']);

    const seller = await this.userService.findById(sellerId);
    if (!seller) throw new BadRequestException(['Seller not found']);

    const customer = await this.userService.findById(customerId);
    if (!customer) throw new BadRequestException(['Customer not found']);
    if (customer.role !== Role.CUSTOMER)
      throw new BadRequestException(['Customer must be a customer']);

    const ticketSold = await this.ticketService.countSold(ticketId);

    if (ticketSold >= ticket.quantity)
      throw new BadRequestException(['Ticket all sold out']);

    if (ticketSold + quantity > ticket.quantity)
      throw new BadRequestException(['Ticket quantity exceeded available']);

    const data = Array.from({ length: quantity }).map(() => ({
      ticketId,
      sellerId,
      customerId,
    }));

    await this.prisma.ticketSale.createMany({ data });

    const ticketSales = await this.prisma.ticketSale.findMany({
      where: {
        ticketId,
        sellerId,
        customerId,
      },
      orderBy: { id: 'desc' },
      take: quantity,
    });

    for (const sale of ticketSales) {
      const qrContent = `${sale.id}`;
      const dataUrl = await QRCode.toDataURL(qrContent);

      await this.prisma.ticketSale.update({
        where: { id: sale.id },
        data: { qrCodeBase64: dataUrl },
      });

      const buffer = await QRCode.toBuffer(qrContent);
      // writeFileSync(`qrcodes/qrcode-ticketSale-${sale.id}.png`, buffer);

      const pdfBytes = await generatePdf(buffer, ticket, seller, customer);
      writeFileSync(
        `pdfs/ticketSale-${sale.id}-${new Date().getTime()}.pdf`,
        pdfBytes,
      );
    }

    // TODO: Send email to customer with ticket information and generate PDF to save in a bucket
  }
}
