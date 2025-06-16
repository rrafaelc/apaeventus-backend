import { IsNotEmpty, MinLength } from 'class-validator';

export class ResetPasswordRequest {
  @IsNotEmpty()
  encryptedEmail: string;

  @IsNotEmpty()
  code: string;

  @IsNotEmpty()
  @MinLength(8)
  newPassword: string;
}
