import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AccessTokenResponseDto } from './dtos/access-token-response.dto';
import { LoginResponseDto } from './dtos/login-response.dto';
import { FirstAccessRequest } from './requests/first-access.request';
import { RefreshTokenRequest } from './requests/refresh-token.request';
import { SignInRequest } from './requests/sign-in.request';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('first-access')
  async firstAccess(
    @Body() firstAccessRequest: FirstAccessRequest,
  ): Promise<void> {
    return this.authService.firstAccess(firstAccessRequest);
  }

  @HttpCode(HttpStatus.OK)
  @Post('signin')
  async signIn(
    @Body() signInRequest: SignInRequest,
  ): Promise<LoginResponseDto> {
    return this.authService.signIn(signInRequest);
  }

  @HttpCode(HttpStatus.OK)
  @Post('refresh-token')
  async refreshToken(
    @Body() { refreshToken }: RefreshTokenRequest,
  ): Promise<AccessTokenResponseDto> {
    return this.authService.refreshAccessToken(refreshToken);
  }
}
