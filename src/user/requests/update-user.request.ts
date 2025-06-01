import { IsEmail, IsOptional, MaxLength, MinLength } from 'class-validator';

export class UpdateUserRequest {
  @IsOptional()
  @MinLength(3)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @MinLength(8)
  password?: string;

  @IsOptional()
  rg?: string;

  @IsOptional()
  @MinLength(11)
  @MaxLength(11)
  cellphone?: string;
}
