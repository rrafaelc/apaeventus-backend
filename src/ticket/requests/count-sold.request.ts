import { IsUUID } from 'class-validator';

export class CountSoldRequest {
  @IsUUID()
  ticketId: string;
}
