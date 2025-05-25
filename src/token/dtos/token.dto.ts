import { Role } from '@prisma/client';

export interface TokenDto {
  id: number;
  role: Role;
  iat: number;
  exp: number;
}
