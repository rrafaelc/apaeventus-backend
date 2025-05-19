import { IsEnum, IsUUID } from 'class-validator';
import { Role } from 'generated/prisma';

export class UpdateUserRoleDto {
  @IsUUID()
  id: string;

  @IsEnum(Role)
  role: Role;
}
