import { Role } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  MinLength,
} from 'class-validator';

export class CreateUserRequest {
  @IsNotEmpty()
  @MinLength(3)
  name: string;

  @IsEmail()
  email: string;

  @IsNotEmpty()
  rg: string;

  @IsNotEmpty()
  @MinLength(11)
  cpf: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
