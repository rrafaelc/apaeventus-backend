import { IsNumber, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateCheckoutSessionDto {
  @IsString()
  ticketId: string;

  @IsString()
  userId: string;

  @IsNumber()
  quantity: number;

  @IsUrl()
  @IsOptional()
  successUrl?: string;

  @IsUrl()
  @IsOptional()
  cancelUrl?: string;
}
