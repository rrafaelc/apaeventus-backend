export class ResetPasswordDto {
  encryptedEmail: string;
  code: string;
  newPassword: string;
}
