import { IsNotEmpty } from 'class-validator';

export class ValidateRecoveryCodeRequest {
  @IsNotEmpty()
  encryptedEmail: string;

  @IsNotEmpty()
  code: string;
}
