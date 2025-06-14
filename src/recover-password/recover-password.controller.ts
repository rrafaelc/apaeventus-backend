import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { RecoverPasswordService } from './recover-password.service';
import { GenerateRecoveryCodeRequest } from './requests/generate-recovery-code.request';
import { ResetPasswordRequest } from './requests/reset-password.request';
import { ValidateRecoveryCodeRequest } from './requests/validate-recovery-code.request';

@Controller('recover-password')
export class RecoverPasswordController {
  constructor(
    private readonly recoverPasswordService: RecoverPasswordService,
  ) {}

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  generateRecoveryCode(
    @Body() generateRecoveryCodeRequest: GenerateRecoveryCodeRequest,
  ): Promise<void> {
    return this.recoverPasswordService.generateRecoveryCode(
      generateRecoveryCodeRequest,
    );
  }

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  validateRecoveryCode(
    @Body() validateRecoveryCodeRequest: ValidateRecoveryCodeRequest,
  ): Promise<void> {
    return this.recoverPasswordService.validateRecoveryCode(
      validateRecoveryCodeRequest,
    );
  }

  @Post('reset')
  @HttpCode(HttpStatus.OK)
  resetPassword(
    @Body() resetPasswordRequest: ResetPasswordRequest,
  ): Promise<void> {
    return this.recoverPasswordService.resetPassword(resetPasswordRequest);
  }
}
