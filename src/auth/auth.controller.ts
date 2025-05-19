import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserResponseDto } from 'src/user/dtos/user.response.dto';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { AccessTokenResponseDto } from './dtos/access-token-response.dto';
import { LoginResponseDto } from './dtos/login-response.dto';
import { SignInDto } from './dtos/sign-in.dto';
import { RefreshTokenRequest } from './requests/refresh-token.request';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signin')
  async signIn(@Body() signInDto: SignInDto): Promise<LoginResponseDto> {
    return this.authService.signIn(signInDto);
  }

  @Post('refresh-token')
  async refreshToken(
    @Body() { refreshToken }: RefreshTokenRequest,
  ): Promise<AccessTokenResponseDto> {
    return this.authService.refreshAccessToken(refreshToken);
  }

  @UseGuards(AuthGuard)
  @Post('revoke-token')
  @HttpCode(204)
  async revokeToken(
    @Req() req: Request & { user?: UserResponseDto },
  ): Promise<void> {
    const user = req.user;
    console.log(user);
    await this.authService.revokeRefreshToken('');
  }
}
