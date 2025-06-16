import { IsEmail, IsNotEmpty } from 'class-validator';

export class GenerateRecoveryCodeRequest {
  @IsNotEmpty()
  @IsEmail()
  email: string;
}
