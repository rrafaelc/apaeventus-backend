import { Role } from 'generated/prisma';

export class UserResponseDto {
  id: string;
  email: string;
  name: string;
  refreshToken: string | null;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}
