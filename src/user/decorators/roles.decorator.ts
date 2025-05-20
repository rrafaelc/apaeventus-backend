import { SetMetadata } from '@nestjs/common';
import { Role } from 'generated/prisma';

export const ROLES_KEY = 'role';
export const Roles = (...role: Role[]) => {
  console.log('Roles decorator', role);

  return SetMetadata(ROLES_KEY, role);
};
