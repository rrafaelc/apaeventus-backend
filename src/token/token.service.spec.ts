import { Role, User } from '@prisma/client';
import { JwtConstants } from '../constants/jwt.constants';
import { TokenService } from './token.service';

describe('TokenService', () => {
  let service: TokenService;

  const mockUser: User = {
    id: 'user-123',
    name: 'John Doe',
    email: 'john@example.com',
    password: 'hashedPassword123',
    rg: null,
    cpf: null,
    cellphone: null,
    refreshToken: null,
    role: Role.USER,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TokenService(mockJwtService as any);
  });

  describe('generateAccessToken', () => {
    it('should generate an access token successfully', async () => {
      const expectedToken = 'access-token-123';
      mockJwtService.signAsync.mockResolvedValue(expectedToken);

      const result = await service.generateAccessToken(mockUser);

      expect(result).toBe(expectedToken);
      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        {
          id: mockUser.id,
          role: mockUser.role,
        },
        {
          secret: JwtConstants.secret,
          expiresIn: JwtConstants.expiresIn,
        },
      );
      expect(mockJwtService.signAsync).toHaveBeenCalledTimes(1);
    });

    it('should include user id and role in token payload', async () => {
      const adminUser: User = {
        ...mockUser,
        id: 'admin-456',
        role: Role.ADMIN,
      };
      mockJwtService.signAsync.mockResolvedValue('admin-token');

      await service.generateAccessToken(adminUser);

      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        {
          id: 'admin-456',
          role: Role.ADMIN,
        },
        expect.any(Object),
      );
    });

    it('should throw error if JWT signing fails', async () => {
      mockJwtService.signAsync.mockRejectedValue(
        new Error('JWT signing error'),
      );

      await expect(service.generateAccessToken(mockUser)).rejects.toThrow(
        'JWT signing error',
      );
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a refresh token successfully', async () => {
      const expectedToken = 'refresh-token-123';
      mockJwtService.signAsync.mockResolvedValue(expectedToken);

      const result = await service.generateRefreshToken(mockUser);

      expect(result).toBe(expectedToken);
      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        {
          id: mockUser.id,
          role: mockUser.role,
        },
        {
          secret: JwtConstants.refreshSecret,
          expiresIn: JwtConstants.refreshExpiresIn,
        },
      );
      expect(mockJwtService.signAsync).toHaveBeenCalledTimes(1);
    });

    it('should use refresh secret and expiration', async () => {
      mockJwtService.signAsync.mockResolvedValue('token');

      await service.generateRefreshToken(mockUser);

      const callArgs = mockJwtService.signAsync.mock.calls[0][1];
      expect(callArgs.secret).toBe(JwtConstants.refreshSecret);
      expect(callArgs.expiresIn).toBe(JwtConstants.refreshExpiresIn);
    });

    it('should throw error if JWT signing fails', async () => {
      mockJwtService.signAsync.mockRejectedValue(
        new Error('Refresh token signing error'),
      );

      await expect(service.generateRefreshToken(mockUser)).rejects.toThrow(
        'Refresh token signing error',
      );
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify an access token successfully', async () => {
      const token = 'valid-access-token';
      const expectedPayload = {
        id: 'user-123',
        role: Role.USER,
        iat: 1700000000,
        exp: 1700003600,
      };
      mockJwtService.verifyAsync.mockResolvedValue(expectedPayload);

      const result = await service.verifyAccessToken(token);

      expect(result).toEqual(expectedPayload);
      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith(token, {
        secret: JwtConstants.secret,
      });
      expect(mockJwtService.verifyAsync).toHaveBeenCalledTimes(1);
    });

    it('should throw error for invalid token', async () => {
      const invalidToken = 'invalid-token';
      mockJwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      await expect(service.verifyAccessToken(invalidToken)).rejects.toThrow(
        'Invalid token',
      );
    });

    it('should throw error for expired token', async () => {
      const expiredToken = 'expired-token';
      mockJwtService.verifyAsync.mockRejectedValue(new Error('Token expired'));

      await expect(service.verifyAccessToken(expiredToken)).rejects.toThrow(
        'Token expired',
      );
    });

    it('should verify token with correct secret', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({
        id: 'user-123',
        role: Role.USER,
      });

      await service.verifyAccessToken('token');

      const callArgs = mockJwtService.verifyAsync.mock.calls[0][1];
      expect(callArgs.secret).toBe(JwtConstants.secret);
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify a refresh token successfully', async () => {
      const token = 'valid-refresh-token';
      const expectedPayload = {
        id: 'user-123',
        role: Role.USER,
        iat: 1700000000,
        exp: 1700604800,
      };
      mockJwtService.verifyAsync.mockResolvedValue(expectedPayload);

      const result = await service.verifyRefreshToken(token);

      expect(result).toEqual(expectedPayload);
      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith(token, {
        secret: JwtConstants.refreshSecret,
      });
      expect(mockJwtService.verifyAsync).toHaveBeenCalledTimes(1);
    });

    it('should use refresh secret for verification', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({
        id: 'user-123',
        role: Role.USER,
      });

      await service.verifyRefreshToken('refresh-token');

      const callArgs = mockJwtService.verifyAsync.mock.calls[0][1];
      expect(callArgs.secret).toBe(JwtConstants.refreshSecret);
    });

    it('should throw error for invalid refresh token', async () => {
      const invalidToken = 'invalid-refresh-token';
      mockJwtService.verifyAsync.mockRejectedValue(
        new Error('Invalid refresh token'),
      );

      await expect(service.verifyRefreshToken(invalidToken)).rejects.toThrow(
        'Invalid refresh token',
      );
    });

    it('should throw error for expired refresh token', async () => {
      const expiredToken = 'expired-refresh-token';
      mockJwtService.verifyAsync.mockRejectedValue(
        new Error('Refresh token expired'),
      );

      await expect(service.verifyRefreshToken(expiredToken)).rejects.toThrow(
        'Refresh token expired',
      );
    });
  });

  describe('Token generation consistency', () => {
    it('should generate different tokens for access and refresh', async () => {
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token-abc')
        .mockResolvedValueOnce('refresh-token-xyz');

      const accessToken = await service.generateAccessToken(mockUser);
      const refreshToken = await service.generateRefreshToken(mockUser);

      expect(accessToken).not.toBe(refreshToken);
      expect(mockJwtService.signAsync).toHaveBeenCalledTimes(2);
    });

    it('should maintain consistent payload structure for both token types', async () => {
      mockJwtService.signAsync.mockResolvedValue('token');

      await service.generateAccessToken(mockUser);
      await service.generateRefreshToken(mockUser);

      const accessPayload = mockJwtService.signAsync.mock.calls[0][0];
      const refreshPayload = mockJwtService.signAsync.mock.calls[1][0];

      expect(accessPayload).toEqual(refreshPayload);
      expect(accessPayload).toEqual({
        id: mockUser.id,
        role: mockUser.role,
      });
    });
  });
});
