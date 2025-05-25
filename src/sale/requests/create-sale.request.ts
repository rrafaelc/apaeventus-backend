import { IsNumber, Min } from 'class-validator';

export class CreateSaleRequest {
  @IsNumber()
  ticketId: number;

  @IsNumber()
  customerId: number;

  @IsNumber()
  @Min(1)
  quantity: number;
}
