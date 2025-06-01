import { IsNumber, IsUUID, Max, Min } from 'class-validator';

export class CreateSaleRequest {
  @IsUUID()
  ticketId: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  quantity: number;
}
