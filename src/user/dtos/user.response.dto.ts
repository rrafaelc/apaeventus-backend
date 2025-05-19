import { Role } from 'generated/prisma';

export class UserResponseDto {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
  refreshToken: string | null;
}
