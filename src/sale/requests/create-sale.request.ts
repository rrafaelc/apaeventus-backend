import { IsNumber } from 'class-validator';

export class CreateSaleRequest {
  @IsNumber()
  ticketId: number;

  @IsNumber()
  customerId: number;
}
