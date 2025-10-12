import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreatePriceDto {
  @IsString()
  ticketId: string;

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  currency?: string;
}
