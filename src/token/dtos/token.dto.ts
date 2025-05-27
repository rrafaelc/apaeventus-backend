import { Role } from '@prisma/client';

export interface TokenDto {
  id: string;
  role: Role;
  iat: number;
  exp: number;
}
