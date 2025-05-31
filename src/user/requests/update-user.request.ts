import { IsOptional, MinLength } from 'class-validator';

export class UpdateUserRequest {
  @IsOptional()
  @MinLength(3)
  name?: string;

  @IsOptional()
  @MinLength(8)
  password?: string;
}
