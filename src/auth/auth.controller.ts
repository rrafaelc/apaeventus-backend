import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AccessTokenResponseDto } from './dtos/access-token-response.dto';
import { LoginResponseDto } from './dtos/login-response.dto';
import { LoginRequest } from './requests/login.request';
import { RefreshTokenRequest } from './requests/refresh-token.request';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() loginRequest: LoginRequest): Promise<LoginResponseDto> {
    return this.authService.login(loginRequest);
  }

  @HttpCode(HttpStatus.OK)
  @Post('refresh-token')
  async refreshToken(
    @Body() { refreshToken }: RefreshTokenRequest,
  ): Promise<AccessTokenResponseDto> {
    return this.authService.refreshAccessToken(refreshToken);
  }
}
