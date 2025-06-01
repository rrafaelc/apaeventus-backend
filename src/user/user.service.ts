import {
  BadRequestException,
  Injectable,
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
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateUserDto): Promise<UserResponseDto> {
    this.validationCreateUser(data);

    const userAlreadyExists = await this.prisma.user.findUnique({
      where: {
        email: data.email,
      },
    });

    if (userAlreadyExists)
      throw new UnauthorizedException(['User already exists']);

    const userWithSameCpf = await this.prisma.user.findUnique({
      where: {
        cpf: data.cpf,
      },
    });

    if (userWithSameCpf)
      throw new UnauthorizedException(['User with same CPF already exists']);

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await this.prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
      },
    });

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
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async update({ id, ...data }: UpdateUserDto): Promise<UserResponseDto> {
    if (data.email) {
      const userWithSameEmail = await this.prisma.user.findUnique({
        where: { email: data.email },
      });

      if (userWithSameEmail && userWithSameEmail.id !== id)
        throw new UnauthorizedException(['Email already in use']);

      data.refreshToken = null;
    }

    if (data.password) {
      const hashedPassword = await bcrypt.hash(data.password, 10);
      data.password = hashedPassword;
      data.refreshToken = null;
    }

    const user = await this.prisma.user.update({
      where: { id },
      data,
    });

    if (!user) throw new UnauthorizedException(['User not found']);

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
    const user = await this.findById(id);

    if (!user) {
      throw new UnauthorizedException(['User not found']);
    }

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
