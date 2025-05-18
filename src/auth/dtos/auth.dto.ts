import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class SignUpDTO {
  @IsNotEmpty()
  @MinLength(3)
  name: string;

  @IsEmail()
  email: string;

  @IsNotEmpty()
  @MinLength(8)
  password: string;
}

export class SignInDTO {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  password: string;
}
