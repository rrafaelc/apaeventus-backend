import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Address, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { cpf } from 'cpf-cnpj-validator';
import { PrismaService } from 'src/database/prisma.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { UserResponseDto } from './dtos/user.response.dto';
import { IUserService } from './interfaces/IUserService';

@Injectable()
export class UserService implements IUserService {
  private readonly logger = new Logger(UserService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateUserDto): Promise<UserResponseDto> {
    this.logger.debug(`Creating user with email: ${data.email}`);

    this.validationCreateUser(data);

    this.logger.debug(`Checking if user already exists: ${data.email}`);
    const userAlreadyExists = await this.prisma.user.findUnique({
      where: {
        email: data.email,
      },
    });

    if (userAlreadyExists) {
      this.logger.warn(
        `User creation failed: User already exists for email: ${data.email}`,
      );
      throw new UnauthorizedException(['User already exists']);
    }

    this.logger.debug(`Checking for existing CPF: ${data.cpf}`);
    const userWithSameCpf = await this.prisma.user.findUnique({
      where: {
        cpf: data.cpf,
      },
    });

    if (userWithSameCpf) {
      this.logger.warn(`User creation failed: CPF already exists: ${data.cpf}`);
      throw new UnauthorizedException(['User with same CPF already exists']);
    }

    this.logger.debug(`Hashing password for user: ${data.email}`);
    const hashedPassword = await bcrypt.hash(data.password, 10);

    this.logger.debug(`Creating user in database: ${data.email}`);
    const user = await this.prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
      },
    });

    this.logger.log(
      `User created successfully: ${user.email} (ID: ${user.id})`,
    );

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      rg: user.rg,
      cpf: user.cpf,
      cellphone: user.cellphone,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  findAll(): Promise<User[]> {
    throw new Error('Method not implemented.');
  }

  async findAllUserAddresses(userId: string): Promise<Address[]> {
    return await this.prisma.address.findMany({
      where: { userId },
    });
  }

  async findById(id: string): Promise<User | null> {
    this.logger.debug(`Finding user by ID: ${id}`);
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (user) {
      this.logger.debug(`User found by ID: ${id} - ${user.email}`);
    } else {
      this.logger.debug(`User not found by ID: ${id}`);
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    this.logger.debug(`Finding user by email: ${email}`);
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (user) {
      this.logger.debug(`User found by email: ${email} - ID: ${user.id}`);
    } else {
      this.logger.debug(`User not found by email: ${email}`);
    }

    return user;
  }

  async update({ id, ...data }: UpdateUserDto): Promise<UserResponseDto> {
    this.logger.debug(`Updating user with ID: ${id}`);

    if (data.email) {
      this.logger.debug(`Checking if email is already in use: ${data.email}`);
      const userWithSameEmail = await this.prisma.user.findUnique({
        where: { email: data.email },
      });

      if (userWithSameEmail && userWithSameEmail.id !== id) {
        this.logger.warn(`Update failed: Email already in use: ${data.email}`);
        throw new UnauthorizedException(['Email already in use']);
      }

      this.logger.debug('Email changed, clearing refresh token');
      data.refreshToken = null;
    }

    if (data.password) {
      this.logger.debug(`Hashing new password for user ID: ${id}`);
      const hashedPassword = await bcrypt.hash(data.password, 10);
      data.password = hashedPassword;
      data.refreshToken = null;
    }

    this.logger.debug(`Updating user in database: ${id}`);
    const user = await this.prisma.user.update({
      where: { id },
      data,
    });

    if (!user) {
      this.logger.error(`User update failed: User not found with ID: ${id}`);
      throw new UnauthorizedException(['User not found']);
    }

    this.logger.log(`User updated successfully: ${user.email} (ID: ${id})`);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      rg: user.rg,
      cpf: user.cpf,
      cellphone: user.cellphone,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async getProfile(id: string): Promise<UserResponseDto> {
    this.logger.debug(`Getting profile for user ID: ${id}`);

    const user = await this.findById(id);

    if (!user) {
      this.logger.error(
        `Profile retrieval failed: User not found with ID: ${id}`,
      );
      throw new UnauthorizedException(['User not found']);
    }

    this.logger.log(`Profile retrieved successfully for user: ${user.email}`);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      rg: user.rg,
      cpf: user.cpf,
      cellphone: user.cellphone,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private validationCreateUser(createUserDto: CreateUserDto): void {
    if (!cpf.isValid(createUserDto.cpf))
      throw new BadRequestException(['Invalid CPF']);
  }
}
