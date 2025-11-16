import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import * as dayjs from 'dayjs';
import * as utc from 'dayjs/plugin/utc';
import { TicketService } from './ticket.service';

dayjs.extend(utc);

describe('TicketService', () => {
  let service: TicketService;

  const mockPrismaService = {
    ticket: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    ticketSale: {
      count: jest.fn(),
    },
  };

  const mockAwsService = {
    uploadFileToS3: jest.fn(),
    deleteFileFromS3: jest.fn(),
  };

  const mockStripeService = {
    createPrice: jest.fn(),
    createCheckoutSession: jest.fn(),
    constructWebhookEvent: jest.fn(),
    handleSuccessfulPayment: jest.fn(),
  };

  const mockTicket = {
    id: '123e4567-e89b-12d3-a456-426614174000',
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

  beforeEach(() => {
    // Create service instance directly with mocks instead of using Test module
    // to avoid circular dependency issues with StripeService
    service = new TicketService(
      mockPrismaService as any,
      mockAwsService as any,
      mockStripeService as any,
    );

    jest.clearAllMocks();
  });

  describe('create', () => {
    const createTicketDto = {
      title: 'Test Event',
      description: 'Test Description',
      eventDate: '2025-12-01T10:00:00-03:00',
      quantity: 100,
      price: 50.0,
    };

    it('should create a ticket without image successfully', async () => {
      mockPrismaService.ticket.create.mockResolvedValue(mockTicket);
      mockStripeService.createPrice.mockResolvedValue('price_123');
      mockPrismaService.ticket.update.mockResolvedValue({
        ...mockTicket,
        stripePriceId: 'price_123',
      });

      const result = await service.create(createTicketDto);

      expect(result).toEqual({
        ...mockTicket,
        stripePriceId: 'price_123',
      });
      expect(mockPrismaService.ticket.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: createTicketDto.title,
          description: createTicketDto.description,
          quantity: Number(createTicketDto.quantity),
          price: Number(createTicketDto.price),
        }),
      });
      expect(mockStripeService.createPrice).toHaveBeenCalledWith(
        mockTicket.id,
        mockTicket.price,
      );
    });

    it('should create a ticket with image successfully', async () => {
      const imageFile = {
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        size: 1024 * 1024,
        buffer: Buffer.from('test'),
      } as Express.Multer.File;

      mockAwsService.uploadFileToS3.mockResolvedValue(
        'https://s3.amazonaws.com/test.jpg',
      );
      mockPrismaService.ticket.create.mockResolvedValue(mockTicket);
      mockStripeService.createPrice.mockResolvedValue('price_123');
      mockPrismaService.ticket.update.mockResolvedValue({
        ...mockTicket,
        stripePriceId: 'price_123',
      });

      const result = await service.create(createTicketDto, imageFile);

      expect(result).toEqual({
        ...mockTicket,
        stripePriceId: 'price_123',
      });
      expect(mockAwsService.uploadFileToS3).toHaveBeenCalledWith(imageFile);
      expect(mockPrismaService.ticket.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          imageUrl: 'https://s3.amazonaws.com/test.jpg',
        }),
      });
    });

    it('should throw BadRequestException for invalid image format', async () => {
      const imageFile = {
        originalname: 'test.gif',
        mimetype: 'image/gif',
        size: 1024 * 1024,
        buffer: Buffer.from('test'),
      } as Express.Multer.File;

      await expect(service.create(createTicketDto, imageFile)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockAwsService.uploadFileToS3).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for image size too large', async () => {
      const imageFile = {
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        size: 11 * 1024 * 1024, // 11MB
        buffer: Buffer.from('test'),
      } as Express.Multer.File;

      await expect(service.create(createTicketDto, imageFile)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockAwsService.uploadFileToS3).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for event date less than 1 day in future', async () => {
      const invalidDto = {
        ...createTicketDto,
        eventDate: dayjs().add(12, 'hours').format(),
      };

      await expect(service.create(invalidDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrismaService.ticket.create).not.toHaveBeenCalled();
    });

    it('should rollback ticket creation if Stripe price creation fails', async () => {
      const imageUrl = 'https://s3.amazonaws.com/test.jpg';
      const imageFile = {
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        size: 1024 * 1024,
        buffer: Buffer.from('test'),
      } as Express.Multer.File;

      mockAwsService.uploadFileToS3.mockResolvedValue(imageUrl);
      mockPrismaService.ticket.create.mockResolvedValue(mockTicket);
      mockStripeService.createPrice.mockRejectedValue(
        new Error('Stripe error'),
      );
      mockAwsService.deleteFileFromS3.mockResolvedValue(undefined);
      mockPrismaService.ticket.delete.mockResolvedValue(mockTicket);

      await expect(service.create(createTicketDto, imageFile)).rejects.toThrow(
        BadRequestException,
      );

      expect(mockAwsService.deleteFileFromS3).toHaveBeenCalledWith(imageUrl);
      expect(mockPrismaService.ticket.delete).toHaveBeenCalledWith({
        where: { id: mockTicket.id },
      });
    });

    it('should throw InternalServerErrorException on database error', async () => {
      mockPrismaService.ticket.create.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.create(createTicketDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findAll', () => {
    const mockTickets = [
      { ...mockTicket, id: '1', sold: 0 },
      { ...mockTicket, id: '2', quantity: 50, sold: 0 },
    ];

    it('should return all active tickets with sold count', async () => {
      mockPrismaService.ticket.findMany.mockResolvedValue(mockTickets);
      mockPrismaService.ticketSale.count.mockResolvedValue(0);

      const result = await service.findAll({ showInactive: 'false' });

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('sold', 0);
      expect(mockPrismaService.ticket.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          isDeleted: false,
          eventDate: {
            gte: expect.any(Date),
          },
        },
      });
    });

    it('should include inactive tickets when showInactive is true', async () => {
      mockPrismaService.ticket.findMany.mockResolvedValue(mockTickets);
      mockPrismaService.ticketSale.count.mockResolvedValue(0);

      await service.findAll({ showInactive: 'true' });

      expect(mockPrismaService.ticket.findMany).toHaveBeenCalledWith({
        where: {
          isActive: undefined,
          isDeleted: false,
          eventDate: {
            gte: expect.any(Date),
          },
        },
      });
    });

    it('should filter out sold out tickets', async () => {
      const ticketsWithSales = [
        { ...mockTicket, id: '1', quantity: 100 },
        { ...mockTicket, id: '2', quantity: 50 },
        { ...mockTicket, id: '3', quantity: 10 },
      ];

      mockPrismaService.ticket.findMany.mockResolvedValue(ticketsWithSales);
      mockPrismaService.ticketSale.count
        .mockResolvedValueOnce(50) // id: 1, sold: 50
        .mockResolvedValueOnce(50) // id: 2, sold: 50 (sold out)
        .mockResolvedValueOnce(5); // id: 3, sold: 5

      const result = await service.findAll({ showInactive: 'false' });

      expect(result).toHaveLength(2);
      expect(result.find((t) => t.id === '2')).toBeUndefined();
    });

    it('should sort tickets by sold count descending', async () => {
      const ticketsWithSales = [
        { ...mockTicket, id: '1', quantity: 100 },
        { ...mockTicket, id: '2', quantity: 100 },
        { ...mockTicket, id: '3', quantity: 100 },
      ];

      mockPrismaService.ticket.findMany.mockResolvedValue(ticketsWithSales);
      mockPrismaService.ticketSale.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(50)
        .mockResolvedValueOnce(30);

      const result = await service.findAll({ showInactive: 'false' });

      expect(result[0].sold).toBe(50);
      expect(result[1].sold).toBe(30);
      expect(result[2].sold).toBe(10);
    });
  });

  describe('findOne', () => {
    it('should return a ticket by id with sold count', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue(mockTicket);
      mockPrismaService.ticketSale.count.mockResolvedValue(25);

      const result = await service.findOne({ id: mockTicket.id });

      expect(result).toEqual({ ...mockTicket, sold: 25 });
      expect(mockPrismaService.ticket.findUnique).toHaveBeenCalledWith({
        where: { id: mockTicket.id, isDeleted: false },
      });
    });

    it('should throw BadRequestException if ticket not found', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue(null);

      await expect(service.findOne({ id: 'invalid-id' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('enableDisableTicket', () => {
    it('should enable a ticket', async () => {
      const updatedTicket = { ...mockTicket, isActive: true };
      mockPrismaService.ticket.findUnique.mockResolvedValue(mockTicket);
      mockPrismaService.ticketSale.count.mockResolvedValue(0);
      mockPrismaService.ticket.update.mockResolvedValue(updatedTicket);

      const result = await service.enableDisableTicket({
        id: mockTicket.id,
        isActive: true,
      });

      expect(result).toEqual(updatedTicket);
      expect(mockPrismaService.ticket.update).toHaveBeenCalledWith({
        where: { id: mockTicket.id },
        data: { isActive: true },
      });
    });

    it('should disable a ticket', async () => {
      const updatedTicket = { ...mockTicket, isActive: false };
      mockPrismaService.ticket.findUnique.mockResolvedValue(mockTicket);
      mockPrismaService.ticketSale.count.mockResolvedValue(0);
      mockPrismaService.ticket.update.mockResolvedValue(updatedTicket);

      const result = await service.enableDisableTicket({
        id: mockTicket.id,
        isActive: false,
      });

      expect(result).toEqual(updatedTicket);
      expect(mockPrismaService.ticket.update).toHaveBeenCalledWith({
        where: { id: mockTicket.id },
        data: { isActive: false },
      });
    });

    it('should throw BadRequestException if ticket not found', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue(null);

      await expect(
        service.enableDisableTicket({ id: 'invalid-id', isActive: true }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('countSold', () => {
    it('should return the count of sold tickets', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue(mockTicket);
      mockPrismaService.ticketSale.count
        .mockResolvedValueOnce(0) // findOne call
        .mockResolvedValueOnce(42); // countSold call

      const result = await service.countSold({ ticketId: mockTicket.id });

      expect(result).toBe(42);
      expect(mockPrismaService.ticketSale.count).toHaveBeenLastCalledWith({
        where: { ticketId: mockTicket.id },
      });
    });

    it('should throw BadRequestException if ticket not found', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue(null);

      await expect(
        service.countSold({ ticketId: 'invalid-id' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('countUsed', () => {
    it('should return the count of used tickets', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue(mockTicket);
      mockPrismaService.ticketSale.count
        .mockResolvedValueOnce(0) // findOne call
        .mockResolvedValueOnce(15); // countUsed call

      const result = await service.countUsed({ ticketId: mockTicket.id });

      expect(result).toBe(15);
      expect(mockPrismaService.ticketSale.count).toHaveBeenLastCalledWith({
        where: {
          ticketId: mockTicket.id,
          used: true,
        },
      });
    });

    it('should throw BadRequestException if ticket not found', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue(null);

      await expect(
        service.countUsed({ ticketId: 'invalid-id' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('delete', () => {
    it('should soft delete a ticket successfully', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue(mockTicket);
      mockPrismaService.ticketSale.count.mockResolvedValue(0);
      mockPrismaService.ticket.update.mockResolvedValue({
        ...mockTicket,
        isDeleted: true,
      });

      await service.delete({ id: mockTicket.id });

      expect(mockPrismaService.ticket.update).toHaveBeenCalledWith({
        where: { id: mockTicket.id },
        data: { isDeleted: true },
      });
    });

    it('should throw BadRequestException if ticket not found', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue(null);

      await expect(service.delete({ id: 'invalid-id' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if ticket already deleted', async () => {
      const deletedTicket = { ...mockTicket, isDeleted: true };
      mockPrismaService.ticket.findUnique.mockResolvedValue(deletedTicket);
      mockPrismaService.ticketSale.count.mockResolvedValue(0);

      await expect(service.delete({ id: mockTicket.id })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw InternalServerErrorException on database error', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue(mockTicket);
      mockPrismaService.ticketSale.count.mockResolvedValue(0);
      mockPrismaService.ticket.update.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.delete({ id: mockTicket.id })).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
