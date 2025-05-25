import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Request,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthenticatedRequest } from 'src/auth/requests/authenticated-request';
import { Roles } from 'src/user/decorators/roles.decorator';
import { CreateSaleRequest } from './requests/create-sale.request';
import { SaleService } from './sale.service';

@Controller('sale')
export class SaleController {
  constructor(private readonly saleService: SaleService) {}

  @Roles(Role.ADMIN, Role.SELLER)
  @Post()
  create(
    @Request() { userId }: AuthenticatedRequest,
    @Body() createSaleRequest: CreateSaleRequest,
  ): Promise<void> {
    if (!userId) throw new BadRequestException(['UserId not found in request']);

    return this.saleService.create({
      ticketId: createSaleRequest.ticketId,
      sellerId: userId,
      customerId: createSaleRequest.customerId,
      quantity: createSaleRequest.quantity,
    });
  }
}
