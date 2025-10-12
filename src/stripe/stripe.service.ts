import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  forwardRef,
} from '@nestjs/common';
import { StripeConstants } from 'src/constants/stripe.constants';
import { PrismaService } from 'src/database/prisma.service';
import { SaleService } from 'src/sale/sale.service';
import Stripe from 'stripe';
import { IStripeService } from './interfaces/IStripeService';

@Injectable()
export class StripeService implements IStripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly stripe: Stripe;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => SaleService))
    private readonly saleService: SaleService,
  ) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-08-27.basil',
    });
  }

  async createCheckoutSession(data: {
    ticketId: string;
    userId: string;
    quantity: number;
    successUrl?: string;
    cancelUrl?: string;
  }): Promise<{ sessionId: string; url: string }> {
    this.logger.debug(`Creating checkout session for ticket: ${data.ticketId}`);

    // Usar URLs padrão se não forem fornecidas
    const successUrl = data.successUrl || StripeConstants.defaultSuccessUrl;
    const cancelUrl = data.cancelUrl || StripeConstants.defaultCancelUrl;

    this.logger.debug(`Success URL: ${successUrl}`);
    this.logger.debug(`Cancel URL: ${cancelUrl}`);

    // Buscar o ticket
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: data.ticketId },
    });

    if (!ticket) {
      throw new BadRequestException(['Ticket not found']);
    }

    // Criar sessão de checkout do Stripe
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: {
              name: ticket.title,
              description: ticket.description,
              images: ticket.imageUrl ? [ticket.imageUrl] : [],
            },
            unit_amount: Math.round(ticket.price * 100), // Converter para centavos
          },
          quantity: data.quantity,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        ticketId: data.ticketId,
        userId: data.userId,
        quantity: data.quantity.toString(),
      },
    });

    this.logger.debug(`Checkout session created: ${session.id}`);
    return {
      sessionId: session.id,
      url: session.url!,
    };
  }

  async createPrice(
    ticketId: string,
    amount: number,
    currency = 'brl',
  ): Promise<string> {
    this.logger.debug(`Creating Stripe price for ticket: ${ticketId}`);

    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new BadRequestException(['Ticket not found']);
    }

    // Criar produto no Stripe se necessário
    const product = await this.stripe.products.create({
      name: ticket.title,
      description: ticket.description,
      images: ticket.imageUrl ? [ticket.imageUrl] : [],
      metadata: {
        ticketId: ticket.id,
      },
    });

    // Criar preço no Stripe
    const price = await this.stripe.prices.create({
      unit_amount: Math.round(amount * 100), // Converter para centavos
      currency,
      product: product.id,
      metadata: {
        ticketId: ticket.id,
      },
    });

    this.logger.debug(`Stripe price created: ${price.id}`);
    return price.id;
  }

  constructWebhookEvent(payload: string, signature: string): Stripe.Event {
    try {
      return this.stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!,
      );
    } catch (error) {
      this.logger.error('Webhook signature verification failed', error);
      throw new BadRequestException('Webhook signature verification failed');
    }
  }

  async handleSuccessfulPayment(sessionId: string): Promise<void> {
    this.logger.debug(`Handling successful payment for session: ${sessionId}`);

    // Recuperar a sessão do Stripe
    const session = await this.stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      this.logger.warn(`Payment not completed for session: ${sessionId}`);
      return;
    }

    const { ticketId, userId, quantity } = session.metadata!;

    // Verificar se a venda já foi processada
    const existingSales = await this.prisma.ticketSale.findMany({
      where: {
        stripeSessionId: sessionId,
      },
    });

    if (existingSales.length > 0) {
      this.logger.warn(`Sale already processed for session: ${sessionId}`);
      return;
    }

    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      this.logger.error(`Ticket not found: ${ticketId}`);
      return;
    }

    // 1. Criar vendas pendentes no banco
    this.logger.debug(
      `Creating pending sales for session: ${sessionId}, quantity: ${quantity}`,
    );
    const createdSales = await this.saleService.createPendingSales({
      ticketId: ticket.id,
      userId,
      quantity: parseInt(quantity),
    });

    // 2. Atualizar vendas com o stripeSessionId
    await this.prisma.ticketSale.updateMany({
      where: {
        id: { in: createdSales.map((sale) => sale.id) },
      },
      data: {
        stripeSessionId: sessionId,
      },
    });

    // 3. Processar as vendas aprovadas (gerar PDFs e enviar email)
    this.logger.debug(
      `Processing approved sales for session: ${sessionId}, ${createdSales.length} sales`,
    );
    await this.saleService.processApprovedSales(
      createdSales.map((sale) => sale.id),
    );

    this.logger.log(
      `Successfully processed payment for session: ${sessionId}, created ${createdSales.length} tickets`,
    );
  }
}
