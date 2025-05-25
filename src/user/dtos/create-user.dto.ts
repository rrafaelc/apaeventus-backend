import { Role } from '@prisma/client';
import { UserAddressDto } from './user-address.dto';

export class CreateUserDto {
  name: string;
  email: string;
  rg: string;
  cpf: string;
  role?: Role;
  cellphone?: string;
  address?: UserAddressDto;
}
