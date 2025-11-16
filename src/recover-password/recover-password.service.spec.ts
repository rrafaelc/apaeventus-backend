import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { decrypt, encrypt } from '../utils/crypto';
import { RecoverPasswordService } from './recover-password.service';

// Mock the crypto utils
jest.mock('../utils/crypto', () => ({
  encrypt: jest.fn(),
  decrypt: jest.fn(),
}));

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

// Mock crypto.randomInt
jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomInt: jest.fn(),
}));

describe('RecoverPasswordService', () => {
  let service: RecoverPasswordService;

  const mockUser = {
    id: 'user-123',
    name: 'John Doe',
    email: 'john@example.com',
    password: 'hashedPassword',
    rg: null,
    cpf: null,
    cellphone: null,
    refreshToken: 'old-refresh-token',
    role: 'USER',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRecoveryCode = {
    id: 'recovery-123',
    userId: 'user-123',
    code: '123456',
    validated: false,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    recoveryCode: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  const mockAWSService = {
    sendEmail: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RecoverPasswordService(
      mockPrismaService as any,
      mockAWSService as any,
    );
  });

  describe('generateRecoveryCode', () => {
    it('should generate and send recovery code for valid user', async () => {
      const email = 'john@example.com';
      const recoveryCode = '123456';
      const encryptedEmail = 'encrypted-email';

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.recoveryCode.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaService.recoveryCode.create.mockResolvedValue(mockRecoveryCode);
      (crypto.randomInt as jest.Mock).mockReturnValue(123456);
      (encrypt as jest.Mock).mockReturnValue(encryptedEmail);
      mockAWSService.sendEmail.mockResolvedValue(undefined);

      await service.generateRecoveryCode({ email });

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email },
      });
      expect(mockPrismaService.recoveryCode.deleteMany).toHaveBeenCalledWith({
        where: { userId: mockUser.id },
      });
      expect(crypto.randomInt).toHaveBeenCalledWith(100000, 999999);
      expect(mockPrismaService.recoveryCode.create).toHaveBeenCalledWith({
        data: {
          userId: mockUser.id,
          code: recoveryCode,
          expiresAt: expect.any(Date),
        },
      });
      expect(encrypt).toHaveBeenCalledWith(mockUser.email);
      expect(mockAWSService.sendEmail).toHaveBeenCalledWith({
        to: email,
        subject: 'ApaEventus: Recuperação de senha',
        text: expect.stringContaining(recoveryCode),
      });
    });

    it('should delete existing recovery codes before creating new one', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.recoveryCode.deleteMany.mockResolvedValue({ count: 2 });
      mockPrismaService.recoveryCode.create.mockResolvedValue(mockRecoveryCode);
      (crypto.randomInt as jest.Mock).mockReturnValue(123456);
      (encrypt as jest.Mock).mockReturnValue('encrypted');
      mockAWSService.sendEmail.mockResolvedValue(undefined);

      await service.generateRecoveryCode({ email: mockUser.email });

      expect(mockPrismaService.recoveryCode.deleteMany).toHaveBeenCalledWith({
        where: { userId: mockUser.id },
      });
      expect(mockPrismaService.recoveryCode.deleteMany).toHaveBeenCalled();
      expect(mockPrismaService.recoveryCode.create).toHaveBeenCalled();
    });
  });

  describe('validateRecoveryCode', () => {
    it('should validate recovery code successfully', async () => {
      const encryptedEmail = 'encrypted-email';
      const code = '123456';

      (decrypt as jest.Mock).mockReturnValue(mockUser.email);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.recoveryCode.findFirst.mockResolvedValue(
        mockRecoveryCode,
      );
      mockPrismaService.recoveryCode.update.mockResolvedValue(mockRecoveryCode);

      await service.validateRecoveryCode({ encryptedEmail, code });

      expect(decrypt).toHaveBeenCalledWith(encryptedEmail);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: mockUser.email },
      });
      expect(mockPrismaService.recoveryCode.findFirst).toHaveBeenCalledWith({
        where: { userId: mockUser.id, code },
      });
      expect(mockPrismaService.recoveryCode.update).toHaveBeenCalledWith({
        where: { id: mockRecoveryCode.id },
        data: { validated: true },
      });
    });

    it('should throw error for invalid encrypted email', async () => {
      (decrypt as jest.Mock).mockImplementation(() => {
        throw new Error('Decryption failed');
      });

      await expect(
        service.validateRecoveryCode({
          encryptedEmail: 'invalid',
          code: '123456',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error for non-existent user', async () => {
      (decrypt as jest.Mock).mockReturnValue('unknown@example.com');
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.validateRecoveryCode({
          encryptedEmail: 'encrypted',
          code: '123456',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error for invalid recovery code', async () => {
      (decrypt as jest.Mock).mockReturnValue(mockUser.email);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.recoveryCode.findFirst.mockResolvedValue(null);

      await expect(
        service.validateRecoveryCode({
          encryptedEmail: 'encrypted',
          code: 'wrong-code',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error for already validated code', async () => {
      const validatedCode = { ...mockRecoveryCode, validated: true };

      (decrypt as jest.Mock).mockReturnValue(mockUser.email);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.recoveryCode.findFirst.mockResolvedValue(validatedCode);
      mockPrismaService.recoveryCode.delete.mockResolvedValue(validatedCode);

      await expect(
        service.validateRecoveryCode({
          encryptedEmail: 'encrypted',
          code: '123456',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrismaService.recoveryCode.delete).toHaveBeenCalledWith({
        where: { id: validatedCode.id },
      });
    });

    it('should throw error for expired code', async () => {
      const expiredCode = {
        ...mockRecoveryCode,
        expiresAt: new Date(Date.now() - 1000),
      };

      (decrypt as jest.Mock).mockReturnValue(mockUser.email);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.recoveryCode.findFirst.mockResolvedValue(expiredCode);
      mockPrismaService.recoveryCode.delete.mockResolvedValue(expiredCode);

      await expect(
        service.validateRecoveryCode({
          encryptedEmail: 'encrypted',
          code: '123456',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrismaService.recoveryCode.delete).toHaveBeenCalledWith({
        where: { id: expiredCode.id },
      });
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      const encryptedEmail = 'encrypted-email';
      const code = '123456';
      const newPassword = 'newPassword123';
      const hashedPassword = 'hashed-new-password';
      const validatedCode = { ...mockRecoveryCode, validated: true };

      (decrypt as jest.Mock).mockReturnValue(mockUser.email);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.recoveryCode.findFirst.mockResolvedValue(validatedCode);
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        password: hashedPassword,
      });
      mockPrismaService.recoveryCode.delete.mockResolvedValue(validatedCode);

      await service.resetPassword({ encryptedEmail, code, newPassword });

      expect(decrypt).toHaveBeenCalledWith(encryptedEmail);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: mockUser.email },
      });
      expect(mockPrismaService.recoveryCode.findFirst).toHaveBeenCalledWith({
        where: { userId: mockUser.id, code },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(newPassword, 10);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { password: hashedPassword, refreshToken: null },
      });
      expect(mockPrismaService.recoveryCode.delete).toHaveBeenCalledWith({
        where: { id: validatedCode.id },
      });
    });

    it('should throw error for invalid encrypted email', async () => {
      (decrypt as jest.Mock).mockImplementation(() => {
        throw new Error('Decryption failed');
      });

      await expect(
        service.resetPassword({
          encryptedEmail: 'invalid',
          code: '123456',
          newPassword: 'newPass',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error for non-existent user', async () => {
      (decrypt as jest.Mock).mockReturnValue('unknown@example.com');
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.resetPassword({
          encryptedEmail: 'encrypted',
          code: '123456',
          newPassword: 'newPass',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error for invalid recovery code', async () => {
      (decrypt as jest.Mock).mockReturnValue(mockUser.email);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.recoveryCode.findFirst.mockResolvedValue(null);

      await expect(
        service.resetPassword({
          encryptedEmail: 'encrypted',
          code: 'wrong-code',
          newPassword: 'newPass',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error for non-validated code', async () => {
      const nonValidatedCode = { ...mockRecoveryCode, validated: false };

      (decrypt as jest.Mock).mockReturnValue(mockUser.email);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.recoveryCode.findFirst.mockResolvedValue(
        nonValidatedCode,
      );

      await expect(
        service.resetPassword({
          encryptedEmail: 'encrypted',
          code: '123456',
          newPassword: 'newPass',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error for expired code and delete it', async () => {
      const expiredCode = {
        ...mockRecoveryCode,
        validated: true,
        expiresAt: new Date(Date.now() - 1000),
      };

      (decrypt as jest.Mock).mockReturnValue(mockUser.email);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.recoveryCode.findFirst.mockResolvedValue(expiredCode);
      mockPrismaService.recoveryCode.delete.mockResolvedValue(expiredCode);

      await expect(
        service.resetPassword({
          encryptedEmail: 'encrypted',
          code: '123456',
          newPassword: 'newPass',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrismaService.recoveryCode.delete).toHaveBeenCalledWith({
        where: { id: expiredCode.id },
      });
    });

    it('should clear refresh token when resetting password', async () => {
      const validatedCode = { ...mockRecoveryCode, validated: true };

      (decrypt as jest.Mock).mockReturnValue(mockUser.email);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.recoveryCode.findFirst.mockResolvedValue(validatedCode);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      mockPrismaService.user.update.mockResolvedValue(mockUser);
      mockPrismaService.recoveryCode.delete.mockResolvedValue(validatedCode);

      await service.resetPassword({
        encryptedEmail: 'encrypted',
        code: '123456',
        newPassword: 'newPass',
      });

      const updateCall = mockPrismaService.user.update.mock.calls[0][0];
      expect(updateCall.data.refreshToken).toBeNull();
    });
  });
});
