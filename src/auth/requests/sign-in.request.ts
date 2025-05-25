import { IsEmail, IsNotEmpty } from 'class-validator';

export class SignInRequest {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  password: string;
}
