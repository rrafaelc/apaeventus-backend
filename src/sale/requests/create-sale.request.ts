import { IsEmail, IsNumber, Min } from 'class-validator';

export class CreateSaleRequest {
  @IsNumber()
  ticketId: number;

  @IsEmail()
  customerEmail: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}
