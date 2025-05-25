import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
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
      throw new UnauthorizedException('UserId not found in request');
    }

    return `Only admin can see this: Id ${userId}`;
  }
}
