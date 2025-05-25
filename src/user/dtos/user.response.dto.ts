import { Role } from '@prisma/client';
import { UserAddressDto } from './user-address.dto';

export class UserResponseDto {
  id: number;
  email: string;
  name: string;
  rg: string | null;
  cpf: string | null;
  cellphone: string | null;
  refreshToken: string | null;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
  addresses: UserAddressDto[];
}
