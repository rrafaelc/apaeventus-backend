import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
} from '@nestjs/common';
import { RecoverPasswordService } from './recover-password.service';
import { GenerateRecoveryCodeRequest } from './requests/generate-recovery-code.request';
import { ResetPasswordRequest } from './requests/reset-password.request';
import { ValidateRecoveryCodeRequest } from './requests/validate-recovery-code.request';

@Controller('recover-password')
export class RecoverPasswordController {
  private readonly logger = new Logger(RecoverPasswordController.name);

  constructor(
    private readonly recoverPasswordService: RecoverPasswordService,
  ) {}

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  async generateRecoveryCode(
    @Body() generateRecoveryCodeRequest: GenerateRecoveryCodeRequest,
  ): Promise<void> {
    this.logger.log(
      `Recovery code generation requested for email: ${generateRecoveryCodeRequest.email}`,
    );

    try {
      await this.recoverPasswordService.generateRecoveryCode(
        generateRecoveryCodeRequest,
      );
      this.logger.log(
        `Recovery code generated successfully for email: ${generateRecoveryCodeRequest.email}`,
      );
    } catch (error) {
      this.logger.error(
        `Recovery code generation failed for email: ${generateRecoveryCodeRequest.email}`,
        error.stack,
      );
      throw error;
    }
  }

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  async validateRecoveryCode(
    @Body() validateRecoveryCodeRequest: ValidateRecoveryCodeRequest,
  ): Promise<void> {
    this.logger.log(
      `Recovery code validation attempt for encrypted email: ${validateRecoveryCodeRequest.encryptedEmail}`,
    );

    try {
      await this.recoverPasswordService.validateRecoveryCode(
        validateRecoveryCodeRequest,
      );
      this.logger.log(
        `Recovery code validation successful for encrypted email: ${validateRecoveryCodeRequest.encryptedEmail}`,
      );
    } catch (error) {
      this.logger.error(
        `Recovery code validation failed for encrypted email: ${validateRecoveryCodeRequest.encryptedEmail}`,
        error.stack,
      );
      throw error;
    }
  }

  @Post('reset')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body() resetPasswordRequest: ResetPasswordRequest,
  ): Promise<void> {
    this.logger.log(
      `Password reset attempt for encrypted email: ${resetPasswordRequest.encryptedEmail}`,
    );

    try {
      await this.recoverPasswordService.resetPassword(resetPasswordRequest);
      this.logger.log(
        `Password reset successful for encrypted email: ${resetPasswordRequest.encryptedEmail}`,
      );
    } catch (error) {
      this.logger.error(
        `Password reset failed for encrypted email: ${resetPasswordRequest.encryptedEmail}`,
        error.stack,
      );
      throw error;
    }
  }
}
