import { IsNumber, IsUUID, Min } from 'class-validator';

export class CreateSaleRequest {
  @IsUUID()
  ticketId: string;

  @IsUUID()
  userId: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}
