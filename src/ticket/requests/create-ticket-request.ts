import { IsDateString, IsNotEmpty, IsNumber, Min } from 'class-validator';

export class CreateTicketRequest {
  @IsNotEmpty()
  title: string;

  @IsNotEmpty()
  description: string;

  @IsDateString()
  expiresAt: Date;

  @IsNumber()
  @Min(1)
  quantity: number;
}
