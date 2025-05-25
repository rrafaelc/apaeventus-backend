import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { AuthenticatedRequest } from 'src/auth/requests/authenticated-request';
import { Roles } from './decorators/roles.decorator';
import { UpdateUserDto } from './dtos/update-user.dto';
import { UserResponseDto } from './dtos/user.response.dto';
import { CreateUserRequest } from './requests/create-user.request';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Roles(Role.ADMIN, Role.SELLER)
  @Post()
  create(
    @Body() createUserRequest: CreateUserRequest,
  ): Promise<UserResponseDto> {
    return this.userService.create(createUserRequest);
  }

  @HttpCode(HttpStatus.OK)
  @Patch()
  update(@Body() updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
    return this.userService.update(updateUserDto);
  }

  @Delete(':id')
  delete(@Param('id') id: number): Promise<void> {
    return this.userService.delete(id);
  }

  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @Get('profile')
  async profile(
    @Request() { userId }: AuthenticatedRequest,
  ): Promise<UserResponseDto> {
    if (!userId) {
      throw new BadRequestException('UserId not found in request');
    }

    return this.userService.getProfile(userId);
  }
}
