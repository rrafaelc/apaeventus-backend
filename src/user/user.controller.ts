import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { AuthenticatedRequest } from 'src/auth/requests/authenticated-request';
import { UserResponseDto } from './dtos/user.response.dto';
import { CreateUserRequest } from './requests/create-user.request';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  create(
    @Body() createUserRequest: CreateUserRequest,
  ): Promise<UserResponseDto> {
    return this.userService.create(createUserRequest);
  }

  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @Get('profile')
  async profile(
    @Request() { userId }: AuthenticatedRequest,
  ): Promise<UserResponseDto> {
    if (!userId) throw new BadRequestException(['UserId not found in request']);

    return this.userService.getProfile(userId);
  }
}
