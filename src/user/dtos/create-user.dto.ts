import { Role } from '@prisma/client';

export class CreateUserDto {
  name: string;
  email: string;
  rg: string;
  cpf: string;
  role?: Role;
}
