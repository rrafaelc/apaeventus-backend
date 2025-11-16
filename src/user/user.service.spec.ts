import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/database/prisma.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;
  let prisma: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    address: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const validCreateUserDto: CreateUserDto = {
      name: 'João Silva',
      email: 'joao.silva@example.com',
      password: 'Senha123!@#',
      rg: 'MG1234567',
      cpf: '11144477735',
      cellphone: '11987654321',
    };

    const mockCreatedUser: User = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'João Silva',
      email: 'joao.silva@example.com',
      password: 'hashed_password',
      rg: 'MG1234567',
      cpf: '11144477735',
      cellphone: '11987654321',
      role: 'USER',
      refreshToken: null,
      createdAt: new Date('2024-01-01T10:00:00Z'),
      updatedAt: new Date('2024-01-01T10:00:00Z'),
    };

    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should create a user successfully with valid data', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockCreatedUser);

      const result = await service.create(validCreateUserDto);

      expect(result).toEqual({
        id: mockCreatedUser.id,
        email: mockCreatedUser.email,
        name: mockCreatedUser.name,
        role: mockCreatedUser.role,
        rg: mockCreatedUser.rg,
        cpf: mockCreatedUser.cpf,
        cellphone: mockCreatedUser.cellphone,
        createdAt: mockCreatedUser.createdAt,
        updatedAt: mockCreatedUser.updatedAt,
      });

      expect(prisma.user.findUnique).toHaveBeenCalledTimes(2);
      expect(prisma.user.findUnique).toHaveBeenNthCalledWith(1, {
        where: { email: validCreateUserDto.email },
      });
      expect(prisma.user.findUnique).toHaveBeenNthCalledWith(2, {
        where: { cpf: validCreateUserDto.cpf },
      });
      expect(prisma.user.create).toHaveBeenCalledTimes(1);
    });

    it('should hash the password before creating user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockCreatedUser);

      const bcryptHashSpy = jest.spyOn(bcrypt, 'hash');

      await service.create(validCreateUserDto);

      expect(bcryptHashSpy).toHaveBeenCalledWith(
        validCreateUserDto.password,
        10,
      );

      // Verifica que a senha foi hasheada (diferente da original)
      const createCall = mockPrismaService.user.create.mock.calls[0][0];
      expect(createCall.data.password).toBeDefined();
      expect(createCall.data.password).not.toBe(validCreateUserDto.password);
      expect(typeof createCall.data.password).toBe('string');
    });

    it('should throw UnauthorizedException if email already exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValueOnce(mockCreatedUser);

      await expect(service.create(validCreateUserDto)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: validCreateUserDto.email },
      });
      expect(mockPrismaService.user.create).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if CPF already exists', async () => {
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(null) // email não existe
        .mockResolvedValueOnce(mockCreatedUser); // CPF já existe

      await expect(service.create(validCreateUserDto)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { cpf: validCreateUserDto.cpf },
      });
      expect(mockPrismaService.user.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if CPF is invalid', async () => {
      const invalidCpfDto: CreateUserDto = {
        ...validCreateUserDto,
        cpf: '12345678901', // CPF inválido
      };

      await expect(service.create(invalidCpfDto)).rejects.toThrow(
        BadRequestException,
      );

      expect(mockPrismaService.user.findUnique).not.toHaveBeenCalled();
      expect(mockPrismaService.user.create).not.toHaveBeenCalled();
    });

    it('should not include password in the response', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockCreatedUser);

      const result = await service.create(validCreateUserDto);

      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('refreshToken');
    });

    it('should handle database errors gracefully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockRejectedValue(
        new Error('Database connection error'),
      );

      await expect(service.create(validCreateUserDto)).rejects.toThrow(
        'Database connection error',
      );
    });
  });

  describe('findById', () => {
    const mockUser: User = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'João Silva',
      email: 'joao.silva@example.com',
      password: 'hashed_password',
      rg: 'MG1234567',
      cpf: '11144477735',
      cellphone: '11987654321',
      role: 'USER',
      refreshToken: null,
      createdAt: new Date('2024-01-01T10:00:00Z'),
      updatedAt: new Date('2024-01-01T10:00:00Z'),
    };

    it('should return a user when found by ID', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findById(mockUser.id);

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });
    });

    it('should return null when user is not found by ID', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.findById('non-existent-id');

      expect(result).toBeNull();
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'non-existent-id' },
      });
    });
  });

  describe('findByEmail', () => {
    const mockUser: User = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'João Silva',
      email: 'joao.silva@example.com',
      password: 'hashed_password',
      rg: 'MG1234567',
      cpf: '11144477735',
      cellphone: '11987654321',
      role: 'USER',
      refreshToken: null,
      createdAt: new Date('2024-01-01T10:00:00Z'),
      updatedAt: new Date('2024-01-01T10:00:00Z'),
    };

    it('should return a user when found by email', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findByEmail(mockUser.email);

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: mockUser.email },
      });
    });

    it('should return null when user is not found by email', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'nonexistent@example.com' },
      });
    });
  });

  describe('update', () => {
    const mockUser: User = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'João Silva',
      email: 'joao.silva@example.com',
      password: 'hashed_password',
      rg: 'MG1234567',
      cpf: '11144477735',
      cellphone: '11987654321',
      role: 'USER',
      refreshToken: 'refresh_token_123',
      createdAt: new Date('2024-01-01T10:00:00Z'),
      updatedAt: new Date('2024-01-01T10:00:00Z'),
    };

    it('should update user successfully with basic data', async () => {
      const updateDto = {
        id: mockUser.id,
        name: 'João Silva Santos',
        cellphone: '11999999999',
      };

      const updatedUser = { ...mockUser, ...updateDto };
      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.update(updateDto);

      expect(result.name).toBe('João Silva Santos');
      expect(result.cellphone).toBe('11999999999');
      expect(result).not.toHaveProperty('password');
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { name: updateDto.name, cellphone: updateDto.cellphone },
      });
    });

    it('should hash password when updating password', async () => {
      const updateDto = {
        id: mockUser.id,
        password: 'NewPassword123!',
      };

      const bcryptHashSpy = jest.spyOn(bcrypt, 'hash');
      const updatedUser = { ...mockUser, refreshToken: null };
      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      await service.update(updateDto);

      expect(bcryptHashSpy).toHaveBeenCalledWith('NewPassword123!', 10);

      const updateCall = mockPrismaService.user.update.mock.calls[0][0];
      expect(updateCall.data.password).toBeDefined();
      expect(updateCall.data.password).not.toBe('NewPassword123!');
      expect(updateCall.data.refreshToken).toBeNull();
    });

    it('should clear refresh token when changing email', async () => {
      const updateDto = {
        id: mockUser.id,
        email: 'newemail@example.com',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      const updatedUser = {
        ...mockUser,
        email: 'newemail@example.com',
        refreshToken: null,
      };
      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      await service.update(updateDto);

      const updateCall = mockPrismaService.user.update.mock.calls[0][0];
      expect(updateCall.data.refreshToken).toBeNull();
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'newemail@example.com' },
      });
    });

    it('should throw UnauthorizedException if new email already exists', async () => {
      const updateDto = {
        id: mockUser.id,
        email: 'existing@example.com',
      };

      const existingUser: User = {
        ...mockUser,
        id: 'different-user-id',
        email: 'existing@example.com',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(existingUser);

      await expect(service.update(updateDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockPrismaService.user.update).not.toHaveBeenCalled();
    });

    it('should allow updating to same email (user owns the email)', async () => {
      const updateDto = {
        id: mockUser.id,
        email: mockUser.email,
        name: 'Updated Name',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      const updatedUser = { ...mockUser, name: 'Updated Name' };
      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      await service.update(updateDto);

      expect(mockPrismaService.user.update).toHaveBeenCalled();
    });
  });

  describe('getProfile', () => {
    const mockUser: User = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'João Silva',
      email: 'joao.silva@example.com',
      password: 'hashed_password',
      rg: 'MG1234567',
      cpf: '11144477735',
      cellphone: '11987654321',
      role: 'USER',
      refreshToken: null,
      createdAt: new Date('2024-01-01T10:00:00Z'),
      updatedAt: new Date('2024-01-01T10:00:00Z'),
    };

    it('should return user profile successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getProfile(mockUser.id);

      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role,
        rg: mockUser.rg,
        cpf: mockUser.cpf,
        cellphone: mockUser.cellphone,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });
      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getProfile('non-existent-id')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
