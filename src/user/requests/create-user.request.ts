import { IsEmail, IsNotEmpty, MaxLength, MinLength } from 'class-validator';

export class CreateUserRequest {
  @IsNotEmpty()
  @MinLength(3)
  name: string;

  @IsEmail()
  email: string;

  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @IsNotEmpty()
  rg: string;

  @IsNotEmpty()
  @MinLength(11)
  @MaxLength(11)
  cpf: string;

  @MinLength(11)
  @MaxLength(11)
  cellphone: string;
}
