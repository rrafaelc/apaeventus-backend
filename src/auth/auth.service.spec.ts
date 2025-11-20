import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/database/prisma.service';
import { TokenService } from 'src/token/token.service';
import { UserService } from 'src/user/user.service';
import { AuthService } from './auth.service';
import { LoginDto } from './dtos/login.dto';
import { LogoutDto } from './dtos/logout.dto';
import { RefreshTokenDto } from './dtos/refresh-token.dto';

describe('AuthService', () => {
  let service: AuthService;

  const mockUser: User = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'João Silva',
    email: 'joao.silva@example.com',
    password: '$2b$10$hashedPassword',
    rg: 'MG1234567',
    cpf: '11144477735',
    cellphone: '11987654321',
    role: 'USER',
    refreshToken: null,
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:00:00Z'),
  };

  const mockUserService = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
  };

  const mockTokenService = {
    generateAccessToken: jest.fn(),
    generateRefreshToken: jest.fn(),
    verifyRefreshToken: jest.fn(),
  };

  const mockPrismaService = {
    user: {
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: TokenService,
          useValue: mockTokenService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'joao.silva@example.com',
      password: 'Password123!',
    };

    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should login successfully with valid credentials', async () => {
      const accessToken = 'mock_access_token';
      const refreshToken = 'mock_refresh_token';

      mockUserService.findByEmail.mockResolvedValue(mockUser);
      jest
        .spyOn(bcrypt, 'compare')
        .mockImplementation(() => Promise.resolve(true) as any);
      mockTokenService.generateAccessToken.mockResolvedValue(accessToken);
      mockTokenService.generateRefreshToken.mockResolvedValue(refreshToken);
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        refreshToken,
      });

      const result = await service.login(loginDto);

      expect(result).toEqual({
        accessToken,
        refreshToken,
        user: {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          role: mockUser.role,
          rg: mockUser.rg,
          cpf: mockUser.cpf,
          cellphone: mockUser.cellphone,
          createdAt: mockUser.createdAt,
          updatedAt: mockUser.updatedAt,
        },
      });

      expect(mockUserService.findByEmail).toHaveBeenCalledWith(loginDto.email);
      expect(mockTokenService.generateAccessToken).toHaveBeenCalledWith(
        mockUser,
      );
      expect(mockTokenService.generateRefreshToken).toHaveBeenCalledWith(
        mockUser,
      );
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { refreshToken },
      });
    });

    it('should not include password in the response', async () => {
      const accessToken = 'mock_access_token';
      const refreshToken = 'mock_refresh_token';

      mockUserService.findByEmail.mockResolvedValue(mockUser);
      jest
        .spyOn(bcrypt, 'compare')
        .mockImplementation(() => Promise.resolve(true) as any);
      mockTokenService.generateAccessToken.mockResolvedValue(accessToken);
      mockTokenService.generateRefreshToken.mockResolvedValue(refreshToken);
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        refreshToken,
      });

      const result = await service.login(loginDto);

      expect(result.user).not.toHaveProperty('password');
      expect(result.user).not.toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      mockUserService.findByEmail.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(mockUserService.findByEmail).toHaveBeenCalledWith(loginDto.email);
      expect(mockTokenService.generateAccessToken).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when user has no password', async () => {
      const userWithoutPassword = { ...mockUser, password: null };
      mockUserService.findByEmail.mockResolvedValue(userWithoutPassword);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(mockTokenService.generateAccessToken).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when password does not match', async () => {
      mockUserService.findByEmail.mockResolvedValue(mockUser);
      jest
        .spyOn(bcrypt, 'compare')
        .mockImplementation(() => Promise.resolve(false) as any);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(mockTokenService.generateAccessToken).not.toHaveBeenCalled();
      expect(mockTokenService.generateRefreshToken).not.toHaveBeenCalled();
    });

    it('should store refresh token in database', async () => {
      const refreshToken = 'mock_refresh_token';

      mockUserService.findByEmail.mockResolvedValue(mockUser);
      jest
        .spyOn(bcrypt, 'compare')
        .mockImplementation(() => Promise.resolve(true) as any);
      mockTokenService.generateAccessToken.mockResolvedValue('access_token');
      mockTokenService.generateRefreshToken.mockResolvedValue(refreshToken);
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        refreshToken,
      });

      await service.login(loginDto);

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { refreshToken },
      });
    });
  });

  describe('logout', () => {
    const logoutDto: LogoutDto = {
      userId: '550e8400-e29b-41d4-a716-446655440000',
    };

    it('should logout successfully and clear refresh token', async () => {
      mockUserService.findById.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        refreshToken: null,
      });

      await service.logout(logoutDto);

      expect(mockUserService.findById).toHaveBeenCalledWith(logoutDto.userId);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { refreshToken: null },
      });
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      mockUserService.findById.mockResolvedValue(null);

      await expect(service.logout(logoutDto)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(mockUserService.findById).toHaveBeenCalledWith(logoutDto.userId);
      expect(mockPrismaService.user.update).not.toHaveBeenCalled();
    });
  });

  describe('refreshAccessToken', () => {
    const refreshTokenDto: RefreshTokenDto = {
      refreshToken: 'valid_refresh_token',
    };

    const tokenPayload = {
      id: mockUser.id,
      role: mockUser.role,
    };

    it('should generate new access token with valid refresh token', async () => {
      const newAccessToken = 'new_access_token';
      const userWithRefreshToken = {
        ...mockUser,
        refreshToken: refreshTokenDto.refreshToken,
      };

      mockTokenService.verifyRefreshToken.mockResolvedValue(tokenPayload);
      mockUserService.findById.mockResolvedValue(userWithRefreshToken);
      mockTokenService.generateAccessToken.mockResolvedValue(newAccessToken);

      const result = await service.refreshAccessToken(refreshTokenDto);

      expect(result).toEqual({ accessToken: newAccessToken });
      expect(mockTokenService.verifyRefreshToken).toHaveBeenCalledWith(
        refreshTokenDto.refreshToken,
      );
      expect(mockUserService.findById).toHaveBeenCalledWith(mockUser.id);
      expect(mockTokenService.generateAccessToken).toHaveBeenCalledWith(
        userWithRefreshToken,
      );
    });

    it('should throw UnauthorizedException when refresh token is invalid', async () => {
      mockTokenService.verifyRefreshToken.mockRejectedValue(
        new Error('Invalid token'),
      );

      await expect(service.refreshAccessToken(refreshTokenDto)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(mockUserService.findById).not.toHaveBeenCalled();
      expect(mockTokenService.generateAccessToken).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      mockTokenService.verifyRefreshToken.mockResolvedValue(tokenPayload);
      mockUserService.findById.mockResolvedValue(null);

      await expect(service.refreshAccessToken(refreshTokenDto)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(mockTokenService.generateAccessToken).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when refresh token does not match', async () => {
      const userWithDifferentToken = {
        ...mockUser,
        refreshToken: 'different_refresh_token',
      };

      mockTokenService.verifyRefreshToken.mockResolvedValue(tokenPayload);
      mockUserService.findById.mockResolvedValue(userWithDifferentToken);

      await expect(service.refreshAccessToken(refreshTokenDto)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(mockTokenService.generateAccessToken).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when user refresh token is null', async () => {
      const userWithNullToken = {
        ...mockUser,
        refreshToken: null,
      };

      mockTokenService.verifyRefreshToken.mockResolvedValue(tokenPayload);
      mockUserService.findById.mockResolvedValue(userWithNullToken);

      await expect(service.refreshAccessToken(refreshTokenDto)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(mockTokenService.generateAccessToken).not.toHaveBeenCalled();
    });
  });
});
