import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  forwardRef,
} from '@nestjs/common';
import { Ticket, TicketSale } from '@prisma/client';
import { PDFDocument } from 'pdf-lib';
import * as QRCode from 'qrcode';
import { AWSService } from 'src/aws/aws.service';
import { PrismaService } from 'src/database/prisma.service';
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
  private readonly logger = new Logger(SaleService.name);

  constructor(
    @Inject(forwardRef(() => TicketService))
    private readonly ticketService: TicketService,
    private readonly userService: UserService,
    private readonly prisma: PrismaService,
    private readonly awsService: AWSService,
  ) {}

  /**
   * Cria vendas pendentes no banco (sem gerar PDFs ou enviar emails)
   * Usado quando a venda está aguardando confirmação de pagamento do Stripe
   */
  async createPendingSales({
    ticketId,
    userId,
    quantity,
  }: CreateSaleDto): Promise<TicketSale[]> {
    this.logger.debug(
      `Creating pending sales: ticket=${ticketId}, user=${userId}, quantity=${quantity}`,
    );

    const ticket = await this.ticketService.findOne({ id: ticketId });
    if (!ticket) {
      this.logger.warn(`Sale creation failed: Ticket not found: ${ticketId}`);
      throw new BadRequestException(['Ticket not found']);
    }

    const user = await this.userService.findById(userId);
    if (!user) {
      this.logger.warn(`Sale creation failed: User not found: ${userId}`);
      throw new BadRequestException(['User not found']);
    }

    this.logger.debug(`Validating ticket availability for: ${ticket.title}`);
    await this.ticketValidation(ticket, quantity);

    const createdSales: TicketSale[] = [];

    this.logger.debug(
      `Creating ${quantity} pending sales in database transaction`,
    );
    await this.prisma.$transaction(async (prisma) => {
      for (let i = 0; i < quantity; i++) {
        const sale = await prisma.ticketSale.create({
          data: {
            ticketId: ticket.id,
            userId: user.id,
            paymentStatus: 'pending', // Marca como pendente
          },
        });
        createdSales.push(sale);
      }
    });

    this.logger.log(
      `Created ${createdSales.length} pending sale records (awaiting payment confirmation)`,
    );

    return createdSales;
  }

  /**
   * Processa vendas após pagamento aprovado: gera PDFs, QR codes e envia email
   * Chamado pelo webhook do Stripe quando o pagamento é confirmado
   */
  async processApprovedSales(salesIds: string[]): Promise<void> {
    this.logger.debug(
      `Processing approved sales: ${salesIds.length} sales to process`,
    );

    const sales = await this.prisma.ticketSale.findMany({
      where: {
        id: { in: salesIds },
      },
      include: {
        ticket: true,
        customer: true, // 'customer' é o nome da relação no Prisma schema
      },
    });

    if (sales.length === 0) {
      this.logger.warn('No sales found to process');
      return;
    }

    const ticket = sales[0].ticket;
    const user = sales[0].customer;

    this.logger.debug(`Generating PDFs and QR codes for ${sales.length} sales`);
    const pdfDoc = await PDFDocument.create();

    for (const sale of sales) {
      this.logger.debug(`Processing sale: ${sale.id}`);
      const qrContent = sale.id;

      this.logger.debug('Generating QR code buffer');
      const buffer = await QRCode.toBuffer(qrContent);
      await generateOnePagePdf(buffer, ticket, user, pdfDoc);

      this.logger.debug('Generating individual PDF');
      const pdf = await generatePdf(buffer, ticket, user);
      const pngQRCodeBuffer = await QRCode.toBuffer(qrContent, { type: 'png' });
      const qrCodeDataUrl = await QRCode.toDataURL(qrContent);

      const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;

      this.logger.debug(`Uploading PDF to S3: ${filename}.pdf`);
      const pdfUrl = await this.awsService.uploadBufferToS3(
        Buffer.from(pdf),
        `${filename}.pdf`,
        'application/pdf',
      );

      this.logger.debug(`Uploading QR code to S3: ${filename}.png`);
      const qrCodeUrl = await this.awsService.uploadBufferToS3(
        Buffer.from(pngQRCodeBuffer),
        `${filename}.png`,
        'image/png',
      );

      this.logger.debug(`Updating sale record with URLs: ${sale.id}`);
      await this.prisma.ticketSale.update({
        where: { id: sale.id },
        data: {
          pdfUrl,
          qrCodeUrl,
          qrCodeDataUrl,
          paymentStatus: 'paid', // Marca como pago
        },
      });
    }

    this.logger.debug('Generating combined PDF document');
    const onePagePdf = await pdfDoc.save();

    this.logger.debug(`Sending PDF email to: ${user.email}`);
    await this.sendPdfEmail(
      Buffer.from(onePagePdf).toString('base64'),
      user.email,
    );

    this.logger.log(
      `Approved sales processed successfully for user: ${user.email}, ticket: ${ticket.title}, quantity: ${sales.length}`,
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
      subject: 'ApaEventus: Seu ingresso chegou!',
      text: 'Olá! Obrigado por apoiar nossa causa. Seu ingresso está em anexo neste e-mail, pronto para ser utilizado. Aproveite o evento!',
    };

    await this.awsService.sendEmailWithPdf(payload);
  }
}
