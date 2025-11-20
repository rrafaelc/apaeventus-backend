import { BadRequestException } from '@nestjs/common';
import Stripe from 'stripe';
import { StripeService } from './stripe.service';

// Create a complete mock for Stripe
const mockStripe = {
  checkout: {
    sessions: {
      create: jest.fn(),
      retrieve: jest.fn(),
    },
  },
  products: {
    create: jest.fn(),
  },
  prices: {
    create: jest.fn(),
  },
  webhooks: {
    constructEvent: jest.fn(),
  },
};

// Mock the Stripe constructor
jest.mock('stripe', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => mockStripe),
  };
});

describe('StripeService', () => {
  let service: StripeService;

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

  const mockTicketSale = {
    id: 'sale-123',
    ticketId: 'ticket-123',
    userId: 'user-123',
    used: false,
    pdfUrl: 'https://s3.amazonaws.com/pdf.pdf',
    qrCodeUrl: 'https://s3.amazonaws.com/qr.png',
    qrCodeDataUrl: 'data:image/png;base64,abc',
    paymentStatus: 'paid',
    stripeSessionId: 'session-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    ticket: {
      findUnique: jest.fn(),
    },
    ticketSale: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const mockSaleService = {
    createPendingSales: jest.fn(),
    processApprovedSales: jest.fn(),
  };

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create service instance
    service = new StripeService(
      mockPrismaService as any,
      mockSaleService as any,
    );
  });

  describe('createCheckoutSession', () => {
    it('should create a checkout session successfully', async () => {
      const data = {
        ticketId: 'ticket-123',
        userId: 'user-123',
        quantity: 2,
      };

      const mockSession = {
        id: 'session-123',
        url: 'https://checkout.stripe.com/session-123',
        payment_status: 'unpaid',
      };

      mockPrismaService.ticket.findUnique.mockResolvedValue(mockTicket);
      mockStripe.checkout.sessions.create.mockResolvedValue(mockSession as any);

      const result = await service.createCheckoutSession(data);

      expect(result).toEqual({
        sessionId: 'session-123',
        url: 'https://checkout.stripe.com/session-123',
      });
      expect(mockPrismaService.ticket.findUnique).toHaveBeenCalledWith({
        where: { id: 'ticket-123' },
      });
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'brl',
              product_data: {
                name: mockTicket.title,
                description: mockTicket.description,
                images: [mockTicket.imageUrl],
              },
              unit_amount: 5000, // 50.0 * 100
            },
            quantity: 2,
          },
        ],
        mode: 'payment',
        success_url: expect.any(String),
        cancel_url: expect.any(String),
        metadata: {
          ticketId: 'ticket-123',
          userId: 'user-123',
          quantity: '2',
        },
      });
    });

    it('should use custom success and cancel URLs when provided', async () => {
      const data = {
        ticketId: 'ticket-123',
        userId: 'user-123',
        quantity: 1,
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      };

      const mockSession = {
        id: 'session-123',
        url: 'https://checkout.stripe.com/session-123',
      };

      mockPrismaService.ticket.findUnique.mockResolvedValue(mockTicket);
      mockStripe.checkout.sessions.create.mockResolvedValue(mockSession as any);

      await service.createCheckoutSession(data);

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          success_url: 'https://example.com/success',
          cancel_url: 'https://example.com/cancel',
        }),
      );
    });

    it('should throw BadRequestException if ticket not found', async () => {
      const data = {
        ticketId: 'invalid-ticket',
        userId: 'user-123',
        quantity: 1,
      };

      mockPrismaService.ticket.findUnique.mockResolvedValue(null);

      await expect(service.createCheckoutSession(data)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockStripe.checkout.sessions.create).not.toHaveBeenCalled();
    });

    it('should handle ticket without image', async () => {
      const data = {
        ticketId: 'ticket-123',
        userId: 'user-123',
        quantity: 1,
      };

      const ticketWithoutImage = { ...mockTicket, imageUrl: null };
      const mockSession = {
        id: 'session-123',
        url: 'https://checkout.stripe.com/session-123',
      };

      mockPrismaService.ticket.findUnique.mockResolvedValue(ticketWithoutImage);
      mockStripe.checkout.sessions.create.mockResolvedValue(mockSession as any);

      await service.createCheckoutSession(data);

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: [
            expect.objectContaining({
              price_data: expect.objectContaining({
                product_data: expect.objectContaining({
                  images: [],
                }),
              }),
            }),
          ],
        }),
      );
    });
  });

  describe('createPrice', () => {
    it('should create a Stripe price successfully', async () => {
      const mockProduct = {
        id: 'prod-123',
        name: mockTicket.title,
      };

      const mockPrice = {
        id: 'price-123',
        unit_amount: 5000,
      };

      mockPrismaService.ticket.findUnique.mockResolvedValue(mockTicket);
      mockStripe.products.create.mockResolvedValue(mockProduct as any);
      mockStripe.prices.create.mockResolvedValue(mockPrice as any);

      const result = await service.createPrice('ticket-123', 50.0);

      expect(result).toBe('price-123');
      expect(mockPrismaService.ticket.findUnique).toHaveBeenCalledWith({
        where: { id: 'ticket-123' },
      });
      expect(mockStripe.products.create).toHaveBeenCalledWith({
        name: mockTicket.title,
        description: mockTicket.description,
        images: [mockTicket.imageUrl],
        metadata: {
          ticketId: mockTicket.id,
        },
      });
      expect(mockStripe.prices.create).toHaveBeenCalledWith({
        unit_amount: 5000,
        currency: 'brl',
        product: 'prod-123',
        metadata: {
          ticketId: mockTicket.id,
        },
      });
    });

    it('should throw BadRequestException if ticket not found', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue(null);

      await expect(service.createPrice('invalid-ticket', 50.0)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockStripe.products.create).not.toHaveBeenCalled();
    });

    it('should support custom currency', async () => {
      const mockProduct = { id: 'prod-123' };
      const mockPrice = { id: 'price-123' };

      mockPrismaService.ticket.findUnique.mockResolvedValue(mockTicket);
      mockStripe.products.create.mockResolvedValue(mockProduct as any);
      mockStripe.prices.create.mockResolvedValue(mockPrice as any);

      await service.createPrice('ticket-123', 50.0, 'usd');

      expect(mockStripe.prices.create).toHaveBeenCalledWith(
        expect.objectContaining({
          currency: 'usd',
        }),
      );
    });
  });

  describe('constructWebhookEvent', () => {
    it('should construct webhook event successfully', () => {
      const payload = '{"type":"checkout.session.completed"}';
      const signature = 'sig-123';
      const mockEvent = {
        type: 'checkout.session.completed',
        data: { object: {} },
      } as Stripe.Event;

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);

      const result = service.constructWebhookEvent(payload, signature);

      expect(result).toEqual(mockEvent);
      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET,
      );
    });

    it('should throw BadRequestException on signature verification failure', () => {
      const payload = '{"type":"checkout.session.completed"}';
      const signature = 'invalid-sig';

      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Signature verification failed');
      });

      expect(() => service.constructWebhookEvent(payload, signature)).toThrow(
        BadRequestException,
      );
    });
  });

  describe('handleSuccessfulPayment', () => {
    it('should handle successful payment and process sales', async () => {
      const sessionId = 'session-123';
      const mockSession = {
        id: sessionId,
        payment_status: 'paid',
        metadata: {
          ticketId: 'ticket-123',
          userId: 'user-123',
          quantity: '2',
        },
      };

      const createdSales = [
        { ...mockTicketSale, id: 'sale-123' },
        { ...mockTicketSale, id: 'sale-124' },
      ];

      mockStripe.checkout.sessions.retrieve.mockResolvedValue(
        mockSession as any,
      );
      mockPrismaService.ticketSale.findMany.mockResolvedValue([]);
      mockPrismaService.ticket.findUnique.mockResolvedValue(mockTicket);
      mockSaleService.createPendingSales.mockResolvedValue(createdSales);
      mockPrismaService.ticketSale.updateMany.mockResolvedValue({
        count: 2,
      } as any);
      mockSaleService.processApprovedSales.mockResolvedValue(undefined);

      await service.handleSuccessfulPayment(sessionId);

      expect(mockStripe.checkout.sessions.retrieve).toHaveBeenCalledWith(
        sessionId,
      );
      expect(mockSaleService.createPendingSales).toHaveBeenCalledWith({
        ticketId: 'ticket-123',
        userId: 'user-123',
        quantity: 2,
      });
      expect(mockPrismaService.ticketSale.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['sale-123', 'sale-124'] } },
        data: { stripeSessionId: sessionId },
      });
      expect(mockSaleService.processApprovedSales).toHaveBeenCalledWith([
        'sale-123',
        'sale-124',
      ]);
    });

    it('should return early if payment not completed', async () => {
      const sessionId = 'session-123';
      const mockSession = {
        id: sessionId,
        payment_status: 'unpaid',
        metadata: {},
      };

      mockStripe.checkout.sessions.retrieve.mockResolvedValue(
        mockSession as any,
      );

      await service.handleSuccessfulPayment(sessionId);

      expect(mockPrismaService.ticketSale.findMany).not.toHaveBeenCalled();
      expect(mockSaleService.createPendingSales).not.toHaveBeenCalled();
    });

    it('should return early if sale already processed', async () => {
      const sessionId = 'session-123';
      const mockSession = {
        id: sessionId,
        payment_status: 'paid',
        metadata: {
          ticketId: 'ticket-123',
          userId: 'user-123',
          quantity: '2',
        },
      };

      mockStripe.checkout.sessions.retrieve.mockResolvedValue(
        mockSession as any,
      );
      mockPrismaService.ticketSale.findMany.mockResolvedValue([mockTicketSale]);

      await service.handleSuccessfulPayment(sessionId);

      expect(mockSaleService.createPendingSales).not.toHaveBeenCalled();
    });

    it('should return early if ticket not found', async () => {
      const sessionId = 'session-123';
      const mockSession = {
        id: sessionId,
        payment_status: 'paid',
        metadata: {
          ticketId: 'invalid-ticket',
          userId: 'user-123',
          quantity: '2',
        },
      };

      mockStripe.checkout.sessions.retrieve.mockResolvedValue(
        mockSession as any,
      );
      mockPrismaService.ticketSale.findMany.mockResolvedValue([]);
      mockPrismaService.ticket.findUnique.mockResolvedValue(null);

      await service.handleSuccessfulPayment(sessionId);

      expect(mockSaleService.createPendingSales).not.toHaveBeenCalled();
    });
  });
});
