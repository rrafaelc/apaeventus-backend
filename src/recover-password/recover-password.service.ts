import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { AWSService } from 'src/aws/aws.service';
import { RecoveryPasswordConstants } from 'src/constants/recovery-password.constants';
import { PrismaService } from 'src/database/prisma.service';
import { decrypt, encrypt } from 'src/utils/crypto';
import { GenerateRecoveryCodeDto } from './dtos/generate-recovery-code.dto';
import { ResetPasswordDto } from './dtos/reset-password.dto';
import { ValidateRecoveryCodeDto } from './dtos/validate-recovery-code.dto';
import { IRecoverPasswordService } from './interfaces/IRecoverPasswordService';

@Injectable()
export class RecoverPasswordService implements IRecoverPasswordService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly awsService: AWSService,
  ) {}

  async generateRecoveryCode({
    email,
  }: GenerateRecoveryCodeDto): Promise<void> {
    const user = await this.findUserByEmail(email, 'User not found');

    await this.prismaService.recoveryCode.deleteMany({
      where: { userId: user.id },
    });

    const recoveryCode = crypto.randomInt(100000, 999999).toString();

    await this.prismaService.recoveryCode.create({
      data: {
        userId: user.id,
        code: recoveryCode,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      },
    });

    const encryptedEmail = encrypt(user.email);
    await this.sendEmail(user.email, recoveryCode, encryptedEmail);
  }

  async validateRecoveryCode({
    encryptedEmail,
    code,
  }: ValidateRecoveryCodeDto): Promise<void> {
    const email = this.tryDecrypt(encryptedEmail, 'Invalid recovery code');
    const user = await this.findUserByEmail(email, 'Invalid recovery code');
    const recoveryCode = await this.findRecoveryCode(
      user.id,
      code,
      'Invalid recovery code',
    );

    if (recoveryCode.validated) {
      await this.deleteRecoveryCode(recoveryCode.id);
      throw new BadRequestException(['Invalid recovery code']);
    }

    if (recoveryCode.expiresAt < new Date()) {
      await this.deleteRecoveryCode(recoveryCode.id);
      throw new BadRequestException(['Recovery code has expired']);
    }

    await this.prismaService.recoveryCode.update({
      where: { id: recoveryCode.id },
      data: { validated: true },
    });
  }

  async resetPassword({
    encryptedEmail,
    code,
    newPassword,
  }: ResetPasswordDto): Promise<void> {
    const email = this.tryDecrypt(encryptedEmail, 'Could not reset password');
    const user = await this.findUserByEmail(email, 'Could not reset password');
    const recoveryCode = await this.findRecoveryCode(
      user.id,
      code,
      'Could not reset password',
    );

    if (!recoveryCode.validated) {
      throw new BadRequestException(['Could not reset password']);
    }

    if (recoveryCode.expiresAt < new Date()) {
      await this.deleteRecoveryCode(recoveryCode.id);
      throw new BadRequestException(['Could not reset password']);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prismaService.user.update({
      where: { id: user.id },
      data: { password: hashedPassword, refreshToken: null },
    });

    await this.deleteRecoveryCode(recoveryCode.id);
  }

  private async sendEmail(
    email: string,
    code: string,
    encryptedEmail: string,
  ): Promise<void> {
    const baseUrl = RecoveryPasswordConstants.BaseUrl;

    const payload = {
      to: email,
      subject: 'ApaEventus: Recuperação de senha',
      text: `Olá!

Recebemos uma solicitação para redefinir a sua senha no ApaEventus.

Para continuar, acesse o link abaixo e utilize o código de recuperação informado:

Link: ${baseUrl}?data=${encryptedEmail}
Código de recuperação: ${code}

Atenção: este código é válido por 10 minutos.

Se você não solicitou a recuperação de senha, pode ignorar este e-mail.

Atenciosamente,
Equipe ApaEventus`,
    };
    await this.awsService.sendEmail(payload);
  }

  private tryDecrypt(encrypted: string, errorMsg: string): string {
    try {
      const email = decrypt(encrypted);
      if (!email) throw new Error();
      return email;
    } catch {
      throw new BadRequestException([errorMsg]);
    }
  }

  private async findUserByEmail(email: string, errorMsg: string) {
    const user = await this.prismaService.user.findUnique({ where: { email } });
    if (!user) throw new BadRequestException([errorMsg]);
    return user;
  }

  private async findRecoveryCode(
    userId: string,
    code: string,
    errorMsg: string,
  ) {
    const recoveryCode = await this.prismaService.recoveryCode.findFirst({
      where: { userId, code },
    });
    if (!recoveryCode) throw new BadRequestException([errorMsg]);
    return recoveryCode;
  }

  private async deleteRecoveryCode(id: string) {
    await this.prismaService.recoveryCode.delete({ where: { id } });
  }
}
