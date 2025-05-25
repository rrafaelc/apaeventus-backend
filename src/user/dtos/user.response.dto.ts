import { Role } from '@prisma/client';

export class UserResponseDto {
  id: number;
  email: string;
  name: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
  refreshToken: string | null;
}
