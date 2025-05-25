import { Address, User } from '@prisma/client';
import { CreateUserDto } from '../dtos/create-user.dto';
import { FindUserByEmailDto } from '../dtos/find-user-by-email.dto';
import { FindUserByIdDto } from '../dtos/find-user-by-id.dto';
import { UpdateUserDto } from '../dtos/update-user.dto';
import { UserResponseDto } from '../dtos/user.response.dto';

export interface IUserService {
  create(createUserDto: CreateUserDto): Promise<UserResponseDto>;
  findAll(): Promise<User[]>;
  findAllUserAddresses(userId: number): Promise<Address[]>;
  findById(findUserByIdDto: FindUserByIdDto): Promise<User | null>;
  findByEmail(findUserByEmailDto: FindUserByEmailDto): Promise<User | null>;
  update(updateUserDto: UpdateUserDto): Promise<UserResponseDto>;
  getProfile(id: number): Promise<UserResponseDto>;
}
