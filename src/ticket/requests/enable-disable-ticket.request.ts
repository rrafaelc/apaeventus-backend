import { IsBoolean, IsUUID } from 'class-validator';

export class EnableDisableTicketRequest {
  @IsUUID()
  id: string;

  @IsBoolean()
  isActive: boolean;
}
