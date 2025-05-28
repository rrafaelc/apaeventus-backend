import { IsUUID } from 'class-validator';

export class UpdateAsUnusedRequest {
  @IsUUID()
  saleId: string;
}
