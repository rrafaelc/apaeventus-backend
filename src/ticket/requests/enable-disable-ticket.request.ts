import { IsBoolean, IsNumber } from 'class-validator';

export class EnableDisableTicketRequest {
  @IsNumber()
  id: number;

  @IsBoolean()
  isActive: boolean;
}
