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
import { Role } from '@prisma/client';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { AuthenticatedRequest } from 'src/auth/requests/authenticated-request';
import { Roles } from './decorators/roles.decorator';
import { UserResponseDto } from './dtos/user.response.dto';
import { CreateUserRequest } from './requests/create-user.request';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Roles(Role.ADMIN)
  @Post('create-seller')
  createSeller(
    @Body() createUserRequest: CreateUserRequest,
  ): Promise<UserResponseDto> {
    createUserRequest.role = Role.SELLER;

    return this.userService.create(createUserRequest);
  }

  @Roles(Role.ADMIN, Role.SELLER)
  @Post('create-customer')
  createCustomer(
    @Body() createUserRequest: CreateUserRequest,
  ): Promise<UserResponseDto> {
    createUserRequest.role = Role.CUSTOMER;

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

  // @UseGuards(AuthGuard)
  // async findUserTickets(
  //   @Request() { userId }: AuthenticatedRequest,
  // ): Promise<any> {
  //   if (!userId) throw new BadRequestException(['UserId not found in request']);

  //   return this.userService.findUserTickets(userId);
  // }
}
