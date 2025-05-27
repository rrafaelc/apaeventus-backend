import { Role } from '@prisma/client';

export class UserResponseDto {
  id: string;
  email: string;
  name: string;
  rg: string | null;
  cpf: string | null;
  cellphone: string | null;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}
