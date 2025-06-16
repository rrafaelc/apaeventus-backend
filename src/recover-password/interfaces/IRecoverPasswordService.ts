import { GenerateRecoveryCodeDto } from '../dtos/generate-recovery-code.dto';
import { ResetPasswordDto } from '../dtos/reset-password.dto';
import { ValidateRecoveryCodeDto } from '../dtos/validate-recovery-code.dto';

export interface IRecoverPasswordService {
  generateRecoveryCode(
    generateRecoveryCodeDto: GenerateRecoveryCodeDto,
  ): Promise<void>;
  validateRecoveryCode(
    validateRecoveryCodeDto: ValidateRecoveryCodeDto,
  ): Promise<void>;
  resetPassword(resetPasswordDto: ResetPasswordDto): Promise<void>;
}
