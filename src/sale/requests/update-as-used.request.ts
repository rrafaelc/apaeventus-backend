import { IsUUID } from 'class-validator';

export class UpdateAsUsedRequest {
  @IsUUID()
  saleId: string;
}
