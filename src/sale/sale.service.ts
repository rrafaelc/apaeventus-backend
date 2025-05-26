import { BadRequestException, Injectable } from '@nestjs/common';
import { Role, Ticket, TicketSale } from '@prisma/client';
import { writeFileSync } from 'fs';
import * as QRCode from 'qrcode';
import { PrismaService } from 'src/database/prisma.service';
import { TicketService } from 'src/ticket/ticket.service';
import { UserService } from 'src/user/user.service';
import { decrypt, encrypt } from 'src/utils/encrypt-decrypt';
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
    customerEmail,
    quantity,
  }: CreateSaleDto): Promise<void> {
    const ticket = await this.ticketService.findById(ticketId);
    if (!ticket) throw new BadRequestException(['Ticket not found']);

    const seller = await this.userService.findById(sellerId);
    if (!seller) throw new BadRequestException(['Seller not found']);

    const customer = await this.userService.findByEmail(customerEmail);
    if (!customer) throw new BadRequestException(['Customer not found']);
    if (customer.role !== Role.CUSTOMER)
      throw new BadRequestException(['Customer must be a customer']);

    await this.ticketValidation(ticket, quantity);

    const createdSales: TicketSale[] = [];

    await this.prisma.$transaction(async (prisma) => {
      for (let i = 0; i < quantity; i++) {
        const sale = await prisma.ticketSale.create({
          data: { ticketId, sellerId, customerId: customer.id },
        });
        createdSales.push(sale);
      }
    });

    for (const sale of createdSales) {
      const qrContent = encrypt(`${sale.id}`);
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

  async updateAsUsed(encryptSaleId: string): Promise<void> {
    let saleId: number;

    try {
      saleId = parseInt(decrypt(encryptSaleId));
      if (isNaN(saleId)) throw new BadRequestException(['Invalid sale ID']);
    } catch {
      throw new BadRequestException(['Invalid encrypt text']);
    }

    const ticketSale = await this.prisma.ticketSale.findUnique({
      where: { id: saleId },
    });

    if (!ticketSale) throw new BadRequestException(['TicketSale not found']);

    if (ticketSale.used)
      throw new BadRequestException(['TicketSale already used']);

    await this.prisma.ticketSale.update({
      where: { id: saleId },
      data: { used: true },
    });
  }

  async updateAsUnused(encryptSaleId: string): Promise<void> {
    let saleId: number;

    try {
      saleId = parseInt(decrypt(encryptSaleId));
      if (isNaN(saleId)) throw new BadRequestException(['Invalid sale ID']);
    } catch {
      throw new BadRequestException(['Invalid encrypt text']);
    }

    const ticketSale = await this.prisma.ticketSale.findUnique({
      where: { id: saleId },
    });

    if (!ticketSale) throw new BadRequestException(['TicketSale not found']);

    if (!ticketSale.used)
      throw new BadRequestException(['TicketSale not used yet']);

    await this.prisma.ticketSale.update({
      where: { id: saleId },
      data: { used: false },
    });
  }

  private async ticketValidation(
    ticket: Ticket,
    quantity: number,
  ): Promise<void> {
    if (!ticket.isActive)
      throw new BadRequestException(['Ticket is not active']);

    if (ticket.eventDate < new Date())
      throw new BadRequestException(['Ticket event date is expired']);

    const ticketSold = await this.ticketService.countSold(ticket.id);

    if (ticketSold >= ticket.quantity)
      throw new BadRequestException(['Ticket all sold out']);

    if (ticketSold + quantity > ticket.quantity)
      throw new BadRequestException(['Ticket quantity exceeded available']);
  }
}
