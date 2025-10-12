import {
  BadRequestException,
  Controller,
  Headers,
  Logger,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { StripeService } from './stripe.service';

@Controller('stripe')
export class StripeController {
  private readonly logger = new Logger(StripeController.name);

  constructor(private readonly stripeService: StripeService) {}

  @Post('webhook')
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    this.logger.log('Processing Stripe webhook');

    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    if (!req.rawBody) {
      throw new BadRequestException('Missing raw body');
    }

    try {
      // Usar o rawBody fornecido pelo NestJS (quando rawBody: true está habilitado)
      const payload = req.rawBody.toString('utf8');

      const event = this.stripeService.constructWebhookEvent(
        payload,
        signature,
      );

      this.logger.debug(`Processing webhook event: ${event.type}`);

      switch (event.type) {
        case 'checkout.session.completed':
          await this.stripeService.handleSuccessfulPayment(
            event.data.object.id,
          );
          break;
        case 'product.created':
        case 'price.created':
          this.logger.debug(`Event ${event.type} received - no action needed`);
          break;
        default:
          this.logger.debug(`Unhandled event type: ${event.type}`);
      }

      return { received: true };
    } catch (error) {
      this.logger.error('Webhook processing failed', error.stack);
      throw error;
    }
  }
}
