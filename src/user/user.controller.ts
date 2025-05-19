import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { AuthenticatedRequest } from 'src/auth/requests/authenticated-request';
import { UpdateUserDto } from './dtos/update-user.dto';
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

  @Patch()
  update(@Body() updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
    return this.userService.update(updateUserDto);
  }

  @Delete(':id')
  delete(@Param('id') id: string): Promise<void> {
    return this.userService.delete(id);
  }

  @UseGuards(AuthGuard)
  @Get('profile')
  me(@Request() { userId }: AuthenticatedRequest): string {
    return userId as string;
  }
}
