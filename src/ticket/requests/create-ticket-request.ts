import { IsDateString, IsNotEmpty, IsNumber, Min } from 'class-validator';

export class CreateTicketRequest {
  @IsNotEmpty()
  title: string;

  @IsNotEmpty()
  description: string;

  @IsDateString()
  eventDate: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  price: number;
}
