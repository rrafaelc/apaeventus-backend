import { Address, User } from '@prisma/client';
import { CreateUserDto } from '../dtos/create-user.dto';
import { UpdateUserDto } from '../dtos/update-user.dto';
import { UserResponseDto } from '../dtos/user.response.dto';

export interface IUserService {
  create(createUserDto: CreateUserDto): Promise<UserResponseDto>;
  findAll(): Promise<User[]>;
  findAllUserAddresses(userId: number): Promise<Address[]>;
  findById(id: number): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  update(updateUserDto: UpdateUserDto): Promise<UserResponseDto>;
  getProfile(id: number): Promise<UserResponseDto>;
}
