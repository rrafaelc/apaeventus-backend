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
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { AuthenticatedRequest } from 'src/auth/requests/authenticated-request';
import { Roles } from 'src/user/decorators/roles.decorator';
import { CreateSaleRequest } from './requests/create-sale.request';
import { UpdateAsUnusedRequest } from './requests/update-as-unused.request';
import { UpdateAsUsedRequest } from './requests/update-as-used.request';
import { SaleService } from './sale.service';

@Controller('sale')
export class SaleController {
  constructor(private readonly saleService: SaleService) {}

  @UseGuards(AuthGuard)
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
  updateAsUsed(
    @Body() updateAsUsedRequest: UpdateAsUsedRequest,
  ): Promise<void> {
    return this.saleService.updateAsUsed(updateAsUsedRequest);
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
