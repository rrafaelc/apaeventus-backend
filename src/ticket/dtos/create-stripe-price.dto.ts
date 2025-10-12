import { IsString } from 'class-validator';

export class CreateStripePriceDto {
  @IsString()
  ticketId: string;
}
