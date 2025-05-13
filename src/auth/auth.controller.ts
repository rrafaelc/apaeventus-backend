import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { CustomRequest } from 'src/global/interfaces/custom-request.interface';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { SignInDTO, SignUpDTO } from './dtos/auth';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  async signUp(@Body() body: SignUpDTO) {
    return this.authService.signUp(body);
  }

  @Post('signin')
  async signIn(@Body() body: SignInDTO) {
    return this.authService.signIn(body);
  }

  @UseGuards(AuthGuard)
  @Get('me')
  me(@Request() request: CustomRequest) {
    return request.user;
  }
}
