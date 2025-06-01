import { IsUUID } from 'class-validator';

export class DeleteTicketRequest {
  @IsUUID()
  id: string;
}
