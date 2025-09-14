import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { AuthenticatedRequest } from 'src/auth/requests/authenticated-request';
import { UserResponseDto } from './dtos/user.response.dto';
import { CreateUserRequest } from './requests/create-user.request';
import { UpdateUserRequest } from './requests/update-user.request';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(private readonly userService: UserService) {}

  @Post()
  async create(
    @Body() createUserRequest: CreateUserRequest,
  ): Promise<UserResponseDto> {
    this.logger.log(
      `User creation attempt for email: ${createUserRequest.email}`,
    );

    const result = await this.userService.create(createUserRequest);
    this.logger.log(
      `User created successfully: ${result.email} (ID: ${result.id})`,
    );
    return result;
  }

  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @Patch()
  async update(
    @Request() { userId }: AuthenticatedRequest,
    @Body() updateUserRequest: UpdateUserRequest,
  ): Promise<UserResponseDto> {
    this.logger.log(`User update attempt for user ID: ${userId}`);

    if (!userId) {
      throw new BadRequestException(['UserId not found in request']);
    }

    const result = await this.userService.update({
      id: userId,
      ...updateUserRequest,
    });
    this.logger.log(
      `User updated successfully: ${result.email} (ID: ${userId})`,
    );
    return result;
  }

  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @Get('profile')
  async profile(
    @Request() { userId }: AuthenticatedRequest,
  ): Promise<UserResponseDto> {
    this.logger.log(`Profile request for user ID: ${userId}`);

    if (!userId) {
      throw new BadRequestException(['UserId not found in request']);
    }

    const result = await this.userService.getProfile(userId);
    this.logger.log(`Profile retrieved successfully for user: ${result.email}`);
    return result;
  }
}
