import { Type } from 'class-transformer';
import { IsDateString, IsNotEmpty, IsNumber, Min } from 'class-validator';

export class CreateTicketRequest {
  @IsNotEmpty()
  title: string;

  @IsNotEmpty()
  description: string;

  @IsDateString()
  eventDate: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  quantity: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price: number;
}
