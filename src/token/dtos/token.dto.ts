import { Role } from 'generated/prisma';

export interface TokenDto {
  id: string;
  role: Role;
  iat: number;
  exp: number;
}
