import { IsUUID } from 'class-validator';

export class CountUsedRequest {
  @IsUUID()
  ticketId: string;
}
