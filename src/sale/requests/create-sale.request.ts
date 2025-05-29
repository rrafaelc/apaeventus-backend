import { IsNumber, IsUUID, Min } from 'class-validator';

export class CreateSaleRequest {
  @IsUUID()
  ticketId: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}
