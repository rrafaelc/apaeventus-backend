import { Injectable, UnauthorizedException } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { FindUserByEmailDto } from './dtos/find-user-by-email.dto';
import { FindUserByIdDto } from './dtos/find-user-by-id.dto';
import { UpdateUserRoleDto } from './dtos/update-user-role.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { UserResponseDto } from './dtos/user.response.dto';
import { IUserService } from './interfaces/IUserService';

@Injectable()
export class UserService implements IUserService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateUserDto): Promise<UserResponseDto> {
    const userAlreadyExists = await this.prisma.user.findUnique({
      where: {
        email: data.email,
      },
    });

    if (userAlreadyExists)
      throw new UnauthorizedException('User already exists');

    const user = await this.prisma.user.create({ data });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      refreshToken: user.refreshToken,
    };
  }

  findAll(): Promise<User[]> {
    throw new Error('Method not implemented.');
  }

  async findById({ id }: FindUserByIdDto): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findByEmail({ email }: FindUserByEmailDto): Promise<User | null> {
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
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      refreshToken: user.refreshToken,
    };
  }

  updateRole(updateUserRoleDto: UpdateUserRoleDto): Promise<UserResponseDto> {
    throw new Error('Method not implemented.' + updateUserRoleDto.id);
  }

  delete(id: number): Promise<void> {
    throw new Error('Method not implemented.' + id);
  }

  async getProfile(id: number): Promise<UserResponseDto> {
    const user = await this.findById({ id });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      refreshToken: user.refreshToken,
    };
  }
}
