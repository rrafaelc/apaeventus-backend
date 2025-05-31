import { IsUUID } from 'class-validator';

export class FindTicketByIdRequest {
  @IsUUID()
  id: string;
}
