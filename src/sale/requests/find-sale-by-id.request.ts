import { IsUUID } from 'class-validator';

export class FindSaleByIdRequest {
  @IsUUID()
  id: string;
}
