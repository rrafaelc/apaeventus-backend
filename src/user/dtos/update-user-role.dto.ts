import { Role } from '@prisma/client';

export class UpdateUserRoleDto {
  id: number;
  role: Role;
}
