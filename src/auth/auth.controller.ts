import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AccessTokenResponseDto } from './dtos/access-token-response.dto';
import { LoginResponseDto } from './dtos/login-response.dto';
import { SignInDto } from './dtos/sign-in.dto';
import { AuthGuard } from './guards/auth.guard';
import { AuthenticatedRequest } from './requests/authenticated-request';
import { RefreshTokenRequest } from './requests/refresh-token.request';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('signin')
  async signIn(@Body() signInDto: SignInDto): Promise<LoginResponseDto> {
    return this.authService.signIn(signInDto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('refresh-token')
  async refreshToken(
    @Body() { refreshToken }: RefreshTokenRequest,
  ): Promise<AccessTokenResponseDto> {
    return this.authService.refreshAccessToken(refreshToken);
  }

  // TODO: Deixar só pro Admin remover o refresh token de um usuário
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('revoke-token')
  async revokeToken(
    @Request() { userId }: AuthenticatedRequest,
  ): Promise<void> {
    console.log(userId);
    await this.authService.revokeRefreshToken('');
  }
}
