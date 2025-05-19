import { User } from 'generated/prisma';
import { CreateUserDto } from '../dtos/create-user.dto';
import { FindUserByEmailDto } from '../dtos/find-user-by-email.dto';
import { FindUserByIdDto } from '../dtos/find-user-by-id.dto';
import { UpdateUserRoleDto } from '../dtos/update-user-role.dto';
import { UpdateUserDto } from '../dtos/update-user.dto';
import { UserResponseDto } from '../dtos/user.response.dto';

export interface IUserService {
  create(createUserDto: CreateUserDto): Promise<UserResponseDto>;
  findAll(): Promise<User[]>;
  findById(findUserByIdDto: FindUserByIdDto): Promise<User | null>;
  findByEmail(findUserByEmailDto: FindUserByEmailDto): Promise<User | null>;
  update(updateUserDto: UpdateUserDto): Promise<UserResponseDto>;
  updateRole(updateUserRoleDto: UpdateUserRoleDto): Promise<UserResponseDto>;
  delete(id: string): Promise<void>;
}
