import { Controller, Get, HttpCode, HttpStatus, Request } from '@nestjs/common';
import { Role } from 'generated/prisma';
import { AuthenticatedRequest } from 'src/auth/requests/authenticated-request';
import { Roles } from './decorators/roles.decorator';

@Controller('admin')
export class AdminController {
  constructor() {}

  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @Get('test')
  test(@Request() { userId }: AuthenticatedRequest): string {
    if (!userId) {
      throw new Error('UserId not found in request');
    }

    return `Only admin can see this: Id ${userId}`;
  }
}
