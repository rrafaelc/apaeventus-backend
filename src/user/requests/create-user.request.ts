import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class CreateUserRequest {
  @IsNotEmpty()
  @MinLength(3)
  name: string;

  @IsEmail()
  email: string;

  @IsNotEmpty()
  @MinLength(8)
  password: string;
}
