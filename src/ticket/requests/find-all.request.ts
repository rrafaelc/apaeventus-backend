import { IsBooleanString, IsOptional } from 'class-validator';

export class FindAllRequest {
  @IsOptional()
  @IsBooleanString()
  showInactive?: string;
}
