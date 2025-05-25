import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Address, User } from '@prisma/client';
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

    const { address, ...userData } = data;

    const user = await this.prisma.user.create({
      data: userData,
    });

    if (address) {
      await this.prisma.address.create({
        data: {
          ...address,
          userId: user.id,
        },
      });
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      rg: user.rg,
      cpf: user.cpf,
      cellphone: user.cellphone,
      refreshToken: user.refreshToken,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      addresses: data.address
        ? [
            {
              street: data.address.street,
              number: data.address.number,
              neighborhood: data.address.neighborhood,
              city: data.address.city,
              state: data.address.state,
              zipCode: data.address.zipCode,
            },
          ]
        : [],
    };
  }

  findAll(): Promise<User[]> {
    throw new Error('Method not implemented.');
  }

  async findAllUserAddresses(userId: number): Promise<Address[]> {
    return await this.prisma.address.findMany({
      where: { userId },
    });
  }

  async findById(id: number): Promise<User | null> {
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
    const user = await this.prisma.user.update({
      where: { id },
      data,
    });

    if (!user) {
      throw new UnauthorizedException(['User not found']);
    }

    const addresses = await this.findAllUserAddresses(user.id);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      rg: user.rg,
      cpf: user.cpf,
      cellphone: user.cellphone,
      refreshToken: user.refreshToken,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      addresses: addresses.map((address) => ({
        street: address.street,
        number: address.number,
        neighborhood: address.neighborhood,
        city: address.city,
        state: address.state,
        zipCode: address.zipCode,
      })),
    };
  }

  async getProfile(id: number): Promise<UserResponseDto> {
    const user = await this.findById(id);

    if (!user) {
      throw new UnauthorizedException(['User not found']);
    }

    const addresses = await this.findAllUserAddresses(user.id);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      rg: user.rg,
      cpf: user.cpf,
      cellphone: user.cellphone,
      refreshToken: user.refreshToken,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      addresses: addresses.map((address) => ({
        street: address.street,
        number: address.number,
        neighborhood: address.neighborhood,
        city: address.city,
        state: address.state,
        zipCode: address.zipCode,
      })),
    };
  }

  private validationCreateUser(createUserDto: CreateUserDto): void {
    if (!cpf.isValid(createUserDto.cpf))
      throw new BadRequestException(['Invalid CPF']);
  }
}
