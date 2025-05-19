import { IsUUID } from 'class-validator';

export class FindUserByIdRequest {
  @IsUUID()
  id: string;
}
