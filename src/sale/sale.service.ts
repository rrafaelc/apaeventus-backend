import { BadRequestException, Injectable } from '@nestjs/common';
import { Ticket, TicketSale } from '@prisma/client';
import { unlinkSync, writeFileSync } from 'fs';
import { PDFDocument } from 'pdf-lib';
import * as QRCode from 'qrcode';
import { PrismaService } from 'src/database/prisma.service';
import { LambdaService } from 'src/lambda/lambda.service';
import { TicketService } from 'src/ticket/ticket.service';
import { UserService } from 'src/user/user.service';
import { CreateSaleDto } from './dtos/create-sale.dto';
import { FindAllSaleDto } from './dtos/find-all-sale.dto';
import { FindSaleByIdDto } from './dtos/find-sale-by-id.dto';
import { TicketSaleResponse } from './dtos/ticket-sale.response';
import { UpdateAsUnusedDto } from './dtos/update-as-unused.dto';
import { UpdateAsUsedDto } from './dtos/update-as-used.dto';
import { ISaleService } from './interfaces/ISaleService';
import { generateOnePagePdf } from './utils/generateOnePagePdf';
import { generatePdf } from './utils/generatePdf';

@Injectable()
export class SaleService implements ISaleService {
  constructor(
    private readonly ticketService: TicketService,
    private readonly userService: UserService,
    private readonly prisma: PrismaService,
    private readonly lambdaService: LambdaService,
  ) {}

  async create({ ticketId, userId, quantity }: CreateSaleDto): Promise<void> {
    const ticket = await this.ticketService.findOne({ id: ticketId });
    if (!ticket) throw new BadRequestException(['Ticket not found']);

    const user = await this.userService.findById(userId);
    if (!user) throw new BadRequestException(['User not found']);

    await this.ticketValidation(ticket, quantity);

    const createdSales: TicketSale[] = [];

    await this.prisma.$transaction(async (prisma) => {
      for (let i = 0; i < quantity; i++) {
        const sale = await prisma.ticketSale.create({
          data: { ticketId: ticket.id, userId: user.id },
        });
        createdSales.push(sale);
      }
    });

    const pdfDoc = await PDFDocument.create();
    const pdfPaths: string[] = [];

    for (const sale of createdSales) {
      const qrContent = sale.id;
      const dataUrl = await QRCode.toDataURL(qrContent);

      await this.prisma.ticketSale.update({
        where: { id: sale.id },
        data: { qrCodeDataUrl: dataUrl },
      });

      const buffer = await QRCode.toBuffer(qrContent);

      await generateOnePagePdf(buffer, ticket, user, pdfDoc);

      const pdf = await generatePdf(buffer, ticket, user);

      if (pdf) {
        const path = `pdfs/${sale.id}-${new Date().getTime()}.pdf`;
        writeFileSync(path, pdf);
        pdfPaths.push(path);
      }
    }

    for (const path of pdfPaths) {
      try {
        unlinkSync(path);
      } catch (err) {
        console.error(`Error deleting the pdf: ${path}`, err);
      }
    }

    const onePagePdf = await pdfDoc.save();

    await this.sendPdfEmail(
      Buffer.from(onePagePdf).toString('base64'),
      user.email,
    );
  }

  async find({ userId }: FindAllSaleDto): Promise<TicketSaleResponse[]> {
    const ticketSales = await this.prisma.ticketSale.findMany({
      where: { userId },
      include: {
        ticket: true,
      },
    });

    return ticketSales.map((ticketSale) => ({
      id: ticketSale.id,
      used: ticketSale.used,
      pdfUrl: ticketSale.pdfUrl,
      qrCodeUrl: ticketSale.qrCodeUrl,
      qrCodeDataUrl: ticketSale.qrCodeDataUrl,
      createdAt: ticketSale.createdAt,
      updatedAt: ticketSale.updatedAt,
      ticket: ticketSale.ticket,
    }));
  }

  async findOne({ id }: FindSaleByIdDto): Promise<TicketSaleResponse> {
    const ticketSale = await this.prisma.ticketSale.findUnique({
      where: { id },
      include: {
        ticket: true,
      },
    });

    if (!ticketSale) throw new BadRequestException(['TicketSale not found']);

    return {
      id: ticketSale.id,
      used: ticketSale.used,
      pdfUrl: ticketSale.pdfUrl,
      qrCodeUrl: ticketSale.qrCodeUrl,
      qrCodeDataUrl: ticketSale.qrCodeDataUrl,
      createdAt: ticketSale.createdAt,
      updatedAt: ticketSale.updatedAt,
      ticket: ticketSale.ticket,
    };
  }

  async updateAsUsed({ saleId }: UpdateAsUsedDto): Promise<void> {
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

  async updateAsUnused({ saleId }: UpdateAsUnusedDto): Promise<void> {
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

    const ticketSold = await this.ticketService.countSold({
      ticketId: ticket.id,
    });

    if (ticketSold >= ticket.quantity)
      throw new BadRequestException(['Ticket all sold out']);

    if (ticketSold + quantity > ticket.quantity)
      throw new BadRequestException(['Ticket quantity exceeded available']);
  }

  private async sendPdfEmail(pdfBase64: string, to: string) {
    const payload = {
      pdf: pdfBase64,
      to,
      subject: 'ApaEventus: Seu ingresso está disponível!',
      text: 'Obrigado por ajudar a nossa causa! Seu ingresso está anexado como pdf.',
    };

    await this.lambdaService.sendEmailWithPdf(payload);
  }
}
