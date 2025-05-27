import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthenticatedRequest } from 'src/auth/requests/authenticated-request';
import { Roles } from 'src/user/decorators/roles.decorator';
import { CreateSaleRequest } from './requests/create-sale.request';
import { SaleService } from './sale.service';

@Controller('sale')
export class SaleController {
  constructor(private readonly saleService: SaleService) {}

  @UseGuards()
  @Post()
  create(
    @Request() { userId }: AuthenticatedRequest,
    @Body() createSaleRequest: CreateSaleRequest,
  ): Promise<void> {
    if (!userId) throw new BadRequestException(['UserId not found in request']);

    return this.saleService.create({
      ticketId: createSaleRequest.ticketId,
      userId,
      quantity: createSaleRequest.quantity,
    });
  }

  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @Post('set-used')
  updateAsUsed(@Body('saleId') saleId: string): Promise<void> {
    return this.saleService.updateAsUsed(saleId);
  }

  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @Post('set-unused')
  updateAsUnused(@Body('saleId') saleId: string): Promise<void> {
    return this.saleService.updateAsUnused(saleId);
  }
}
