import { Role } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { UserAddressRequest } from './user-address.request';

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
  @MaxLength(11)
  cpf: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @MinLength(11)
  @MaxLength(11)
  cellphone?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => UserAddressRequest)
  address?: UserAddressRequest;
}
