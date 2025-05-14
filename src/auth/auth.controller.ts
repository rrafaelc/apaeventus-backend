import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { CustomRequest } from 'src/global/interfaces/custom-request.interface';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { SignInDTO, SignUpDTO } from './dtos/auth';
import { RefreshTokenRequest } from './dtos/token';

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

  @Post('refresh-token')
  async refreshToken(@Body() { refreshToken }: RefreshTokenRequest) {
    return this.authService.refreshAccessToken(refreshToken);
  }

  @UseGuards(AuthGuard)
  @Post('revoke-token')
  @HttpCode(204)
  async revokeToken(@Request() request: CustomRequest) {
    const user = request.user;
    await this.authService.revokeRefreshToken(user.id);
  }
}
