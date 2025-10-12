import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { AuthenticatedRequest } from 'src/auth/requests/authenticated-request';
import { StripeService } from 'src/stripe/stripe.service';
import { Roles } from 'src/user/decorators/roles.decorator';
import { TicketSaleResponse } from './dtos/ticket-sale.response';
import { CreateSaleRequest } from './requests/create-sale.request';
import { FindSaleByIdRequest } from './requests/find-sale-by-id.request';
import { UpdateAsUnusedRequest } from './requests/update-as-unused.request';
import { UpdateAsUsedRequest } from './requests/update-as-used.request';
import { SaleService } from './sale.service';

@Controller('sale')
export class SaleController {
  private readonly logger = new Logger(SaleController.name);

  constructor(
    private readonly saleService: SaleService,
    private readonly stripeService: StripeService,
  ) {}

  @UseGuards(AuthGuard)
  @Post()
  async createCheckoutSession(
    @Request() { userId }: AuthenticatedRequest,
    @Body()
    createSaleRequest: CreateSaleRequest & {
      successUrl?: string;
      cancelUrl?: string;
    },
  ) {
    this.logger.log(
      `Creating Stripe checkout session for user: ${userId}, ticket: ${createSaleRequest.ticketId}`,
    );

    if (!userId) {
      throw new BadRequestException(['UserId not found in request']);
    }

    try {
      const result = await this.stripeService.createCheckoutSession({
        ticketId: createSaleRequest.ticketId,
        userId,
        quantity: createSaleRequest.quantity,
        successUrl: createSaleRequest.successUrl,
        cancelUrl: createSaleRequest.cancelUrl,
      });

      this.logger.log(
        `Stripe checkout session created: ${result.sessionId} for user: ${userId}`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to create checkout session for user: ${userId}`,
        error.stack,
      );
      throw error;
    }
  }

  @UseGuards(AuthGuard)
  @Get()
  async find(
    @Request() { userId }: AuthenticatedRequest,
  ): Promise<TicketSaleResponse[]> {
    this.logger.log(`Finding sales for user: ${userId}`);

    if (!userId) {
      this.logger.error('Find sales failed: UserId not found in request');
      throw new BadRequestException(['UserId not found in request']);
    }

    try {
      const result = await this.saleService.find({ userId });
      this.logger.log(`Found ${result.length} sales for user: ${userId}`);
      return result;
    } catch (error) {
      this.logger.error(`Find sales failed for user: ${userId}`, error.stack);
      throw error;
    }
  }

  @UseGuards(AuthGuard)
  @Get(':id')
  findOne(
    @Param() findSaleByIdRequest: FindSaleByIdRequest,
  ): Promise<TicketSaleResponse> {
    return this.saleService.findOne(findSaleByIdRequest);
  }

  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @Post('set-used')
  async updateAsUsed(
    @Body() updateAsUsedRequest: UpdateAsUsedRequest,
  ): Promise<void> {
    this.logger.log(
      `Marking ticket sale as used: ${updateAsUsedRequest.saleId}`,
    );

    try {
      await this.saleService.updateAsUsed(updateAsUsedRequest);
      this.logger.log(
        `Ticket sale marked as used: ${updateAsUsedRequest.saleId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to mark ticket sale as used: ${updateAsUsedRequest.saleId}`,
        error.stack,
      );
      throw error;
    }
  }

  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @Post('set-unused')
  updateAsUnused(
    @Body() updateAsUnusedRequest: UpdateAsUnusedRequest,
  ): Promise<void> {
    return this.saleService.updateAsUnused(updateAsUnusedRequest);
  }
}
