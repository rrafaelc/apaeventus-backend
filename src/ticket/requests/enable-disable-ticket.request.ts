import { IsBoolean, IsNumber } from 'class-validator';

export class EnableDisableTicketRequest {
  @IsNumber()
  id: string;

  @IsBoolean()
  isActive: boolean;
}
