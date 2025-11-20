import { BadRequestException } from '@nestjs/common';
import { SaleService } from './sale.service';

// Mock QRCode module
jest.mock('qrcode', () => ({
  toBuffer: jest.fn(),
  toDataURL: jest.fn(),
}));

// Mock pdf-lib module
jest.mock('pdf-lib', () => ({
  PDFDocument: {
    create: jest.fn(),
  },
}));

// Mock generatePdf and generateOnePagePdf utilities
jest.mock('./utils/generatePdf', () => ({
  generatePdf: jest.fn(),
}));

jest.mock('./utils/generateOnePagePdf', () => ({
  generateOnePagePdf: jest.fn(),
}));

import { PDFDocument } from 'pdf-lib';
import * as QRCode from 'qrcode';
import { generateOnePagePdf } from './utils/generateOnePagePdf';
import { generatePdf } from './utils/generatePdf';

describe('SaleService', () => {
  let service: SaleService;

  const mockTicket = {
    id: 'ticket-123',
    title: 'Test Event',
    description: 'Test Description',
    eventDate: new Date('2025-12-01T10:00:00.000Z'),
    quantity: 100,
    price: 50.0,
    imageUrl: 'https://example.com/image.jpg',
    isActive: true,
    isDeleted: false,
    stripePriceId: 'price_123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUser = {
    id: 'user-123',
    name: 'John Doe',
    email: 'john@example.com',
    cpf: '11144477735',
    password: 'hashed_password',
    role: 'USER' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTicketSale = {
    id: 'sale-123',
    ticketId: 'ticket-123',
    userId: 'user-123',
    used: false,
    pdfUrl: 'https://s3.amazonaws.com/pdf.pdf',
    qrCodeUrl: 'https://s3.amazonaws.com/qr.png',
    qrCodeDataUrl: 'data:image/png;base64,abc',
    paymentStatus: 'paid',
    stripeSessionId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    ticketSale: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockTicketService = {
    findOne: jest.fn(),
    countSold: jest.fn(),
  };

  const mockUserService = {
    findById: jest.fn(),
  };

  const mockAwsService = {
    uploadBufferToS3: jest.fn(),
    sendEmailWithPdf: jest.fn(),
  };

  const mockPdfDoc = {
    save: jest.fn(),
  };

  beforeEach(() => {
    service = new SaleService(
      mockTicketService as any,
      mockUserService as any,
      mockPrismaService as any,
      mockAwsService as any,
    );

    jest.clearAllMocks();

    // Setup default mocks
    (PDFDocument.create as jest.Mock).mockResolvedValue(mockPdfDoc);
    (QRCode.toBuffer as jest.Mock).mockResolvedValue(Buffer.from('qr-buffer'));
    (QRCode.toDataURL as jest.Mock).mockResolvedValue(
      'data:image/png;base64,abc',
    );
    (generatePdf as jest.Mock).mockResolvedValue(Buffer.from('pdf-content'));
    (generateOnePagePdf as jest.Mock).mockResolvedValue(undefined);
    mockPdfDoc.save.mockResolvedValue(Buffer.from('combined-pdf'));
  });

  describe('createPendingSales', () => {
    it('should create pending sales successfully', async () => {
      const createSaleDto = {
        ticketId: 'ticket-123',
        userId: 'user-123',
        quantity: 2,
      };

      mockTicketService.findOne.mockResolvedValue({
        ...mockTicket,
        sold: 10,
      });
      mockUserService.findById.mockResolvedValue(mockUser);
      mockTicketService.countSold.mockResolvedValue(10);

      const pendingSales = [
        {
          ...mockTicketSale,
          paymentStatus: 'pending',
          pdfUrl: null,
          qrCodeUrl: null,
          qrCodeDataUrl: null,
        },
        {
          ...mockTicketSale,
          id: 'sale-124',
          paymentStatus: 'pending',
          pdfUrl: null,
          qrCodeUrl: null,
          qrCodeDataUrl: null,
        },
      ];

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return await callback({
          ticketSale: {
            create: jest
              .fn()
              .mockResolvedValueOnce(pendingSales[0])
              .mockResolvedValueOnce(pendingSales[1]),
          },
        });
      });

      const result = await service.createPendingSales(createSaleDto);

      expect(result).toHaveLength(2);
      expect(mockTicketService.findOne).toHaveBeenCalledWith({
        id: 'ticket-123',
      });
      expect(mockUserService.findById).toHaveBeenCalledWith('user-123');
      expect(mockTicketService.countSold).toHaveBeenCalledWith({
        ticketId: 'ticket-123',
      });
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException if ticket not found', async () => {
      const createSaleDto = {
        ticketId: 'invalid-ticket',
        userId: 'user-123',
        quantity: 1,
      };

      mockTicketService.findOne.mockResolvedValue(null);

      await expect(service.createPendingSales(createSaleDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockUserService.findById).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if user not found', async () => {
      const createSaleDto = {
        ticketId: 'ticket-123',
        userId: 'invalid-user',
        quantity: 1,
      };

      mockTicketService.findOne.mockResolvedValue({ ...mockTicket, sold: 10 });
      mockUserService.findById.mockResolvedValue(null);

      await expect(service.createPendingSales(createSaleDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if ticket is not active', async () => {
      const createSaleDto = {
        ticketId: 'ticket-123',
        userId: 'user-123',
        quantity: 1,
      };

      mockTicketService.findOne.mockResolvedValue({
        ...mockTicket,
        isActive: false,
        sold: 10,
      });
      mockUserService.findById.mockResolvedValue(mockUser);

      await expect(service.createPendingSales(createSaleDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if ticket event date is expired', async () => {
      const createSaleDto = {
        ticketId: 'ticket-123',
        userId: 'user-123',
        quantity: 1,
      };

      mockTicketService.findOne.mockResolvedValue({
        ...mockTicket,
        eventDate: new Date('2020-01-01'),
        sold: 10,
      });
      mockUserService.findById.mockResolvedValue(mockUser);

      await expect(service.createPendingSales(createSaleDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if ticket is sold out', async () => {
      const createSaleDto = {
        ticketId: 'ticket-123',
        userId: 'user-123',
        quantity: 1,
      };

      mockTicketService.findOne.mockResolvedValue({
        ...mockTicket,
        sold: 10,
      });
      mockUserService.findById.mockResolvedValue(mockUser);
      mockTicketService.countSold.mockResolvedValue(100);

      await expect(service.createPendingSales(createSaleDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if quantity exceeds available', async () => {
      const createSaleDto = {
        ticketId: 'ticket-123',
        userId: 'user-123',
        quantity: 50,
      };

      mockTicketService.findOne.mockResolvedValue({
        ...mockTicket,
        sold: 10,
      });
      mockUserService.findById.mockResolvedValue(mockUser);
      mockTicketService.countSold.mockResolvedValue(60);

      await expect(service.createPendingSales(createSaleDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('processApprovedSales', () => {
    it('should process approved sales successfully', async () => {
      const salesIds = ['sale-123', 'sale-124'];
      const salesWithRelations = [
        {
          ...mockTicketSale,
          ticket: mockTicket,
          customer: mockUser,
        },
        {
          ...mockTicketSale,
          id: 'sale-124',
          ticket: mockTicket,
          customer: mockUser,
        },
      ];

      mockPrismaService.ticketSale.findMany.mockResolvedValue(
        salesWithRelations,
      );
      mockAwsService.uploadBufferToS3
        .mockResolvedValueOnce('https://s3.amazonaws.com/pdf1.pdf')
        .mockResolvedValueOnce('https://s3.amazonaws.com/qr1.png')
        .mockResolvedValueOnce('https://s3.amazonaws.com/pdf2.pdf')
        .mockResolvedValueOnce('https://s3.amazonaws.com/qr2.png');
      mockPrismaService.ticketSale.update.mockResolvedValue(mockTicketSale);
      mockAwsService.sendEmailWithPdf.mockResolvedValue(undefined);

      await service.processApprovedSales(salesIds);

      expect(mockPrismaService.ticketSale.findMany).toHaveBeenCalledWith({
        where: { id: { in: salesIds } },
        include: { ticket: true, customer: true },
      });
      expect(QRCode.toBuffer).toHaveBeenCalledTimes(4); // 2 sales x 2 calls each
      expect(generatePdf).toHaveBeenCalledTimes(2);
      expect(generateOnePagePdf).toHaveBeenCalledTimes(2);
      expect(mockAwsService.uploadBufferToS3).toHaveBeenCalledTimes(4); // 2 PDFs + 2 QR codes
      expect(mockPrismaService.ticketSale.update).toHaveBeenCalledTimes(2);
      expect(mockAwsService.sendEmailWithPdf).toHaveBeenCalledWith(
        expect.objectContaining({
          to: mockUser.email,
          subject: 'ApaEventus: Seu ingresso chegou!',
        }),
      );
    });

    it('should return early if no sales found', async () => {
      const salesIds = ['invalid-id'];

      mockPrismaService.ticketSale.findMany.mockResolvedValue([]);

      await service.processApprovedSales(salesIds);

      expect(mockPrismaService.ticketSale.findMany).toHaveBeenCalled();
      expect(QRCode.toBuffer).not.toHaveBeenCalled();
      expect(mockAwsService.sendEmailWithPdf).not.toHaveBeenCalled();
    });
  });

  describe('find', () => {
    it('should return all sales for a user', async () => {
      const userId = 'user-123';
      const ticketSales = [
        { ...mockTicketSale, ticket: mockTicket },
        { ...mockTicketSale, id: 'sale-124', ticket: mockTicket },
      ];

      mockPrismaService.ticketSale.findMany.mockResolvedValue(ticketSales);

      const result = await service.find({ userId });

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('id', 'sale-123');
      expect(result[0]).toHaveProperty('ticket');
      expect(mockPrismaService.ticketSale.findMany).toHaveBeenCalledWith({
        where: { userId },
        include: { ticket: true },
      });
    });

    it('should return empty array if user has no sales', async () => {
      const userId = 'user-123';

      mockPrismaService.ticketSale.findMany.mockResolvedValue([]);

      const result = await service.find({ userId });

      expect(result).toHaveLength(0);
    });
  });

  describe('findOne', () => {
    it('should return a sale by id', async () => {
      const saleId = 'sale-123';

      mockPrismaService.ticketSale.findUnique.mockResolvedValue({
        ...mockTicketSale,
        ticket: mockTicket,
      });

      const result = await service.findOne({ id: saleId });

      expect(result).toHaveProperty('id', 'sale-123');
      expect(result).toHaveProperty('ticket');
      expect(mockPrismaService.ticketSale.findUnique).toHaveBeenCalledWith({
        where: { id: saleId },
        include: { ticket: true },
      });
    });

    it('should throw BadRequestException if sale not found', async () => {
      const saleId = 'invalid-id';

      mockPrismaService.ticketSale.findUnique.mockResolvedValue(null);

      await expect(service.findOne({ id: saleId })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('updateAsUsed', () => {
    it('should mark a sale as used', async () => {
      const saleId = 'sale-123';

      mockPrismaService.ticketSale.findUnique.mockResolvedValue({
        ...mockTicketSale,
        used: false,
      });
      mockPrismaService.ticketSale.update.mockResolvedValue({
        ...mockTicketSale,
        used: true,
      });

      await service.updateAsUsed({ saleId });

      expect(mockPrismaService.ticketSale.update).toHaveBeenCalledWith({
        where: { id: saleId },
        data: { used: true },
      });
    });

    it('should throw BadRequestException if sale not found', async () => {
      const saleId = 'invalid-id';

      mockPrismaService.ticketSale.findUnique.mockResolvedValue(null);

      await expect(service.updateAsUsed({ saleId })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if sale already used', async () => {
      const saleId = 'sale-123';

      mockPrismaService.ticketSale.findUnique.mockResolvedValue({
        ...mockTicketSale,
        used: true,
      });

      await expect(service.updateAsUsed({ saleId })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('updateAsUnused', () => {
    it('should mark a sale as unused', async () => {
      const saleId = 'sale-123';

      mockPrismaService.ticketSale.findUnique.mockResolvedValue({
        ...mockTicketSale,
        used: true,
      });
      mockPrismaService.ticketSale.update.mockResolvedValue({
        ...mockTicketSale,
        used: false,
      });

      await service.updateAsUnused({ saleId });

      expect(mockPrismaService.ticketSale.update).toHaveBeenCalledWith({
        where: { id: saleId },
        data: { used: false },
      });
    });

    it('should throw BadRequestException if sale not found', async () => {
      const saleId = 'invalid-id';

      mockPrismaService.ticketSale.findUnique.mockResolvedValue(null);

      await expect(service.updateAsUnused({ saleId })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if sale not used yet', async () => {
      const saleId = 'sale-123';

      mockPrismaService.ticketSale.findUnique.mockResolvedValue({
        ...mockTicketSale,
        used: false,
      });

      await expect(service.updateAsUnused({ saleId })).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
