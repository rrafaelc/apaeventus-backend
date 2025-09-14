import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AccessTokenResponseDto } from './dtos/access-token-response.dto';
import { LoginResponseDto } from './dtos/login-response.dto';
import { AuthGuard } from './guards/auth.guard';
import { AuthenticatedRequest } from './requests/authenticated-request';
import { LoginRequest } from './requests/login.request';
import { RefreshTokenRequest } from './requests/refresh-token.request';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() loginRequest: LoginRequest): Promise<LoginResponseDto> {
    this.logger.log(`Login attempt for email: ${loginRequest.email}`);

    const result = await this.authService.login(loginRequest);
    this.logger.log(`Login successful for user: ${result.user.email}`);
    return result;
  }

  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  async logout(@Request() { userId }: AuthenticatedRequest): Promise<void> {
    this.logger.log(`Logout attempt for user ID: ${userId}`);

    if (!userId) {
      throw new BadRequestException(['UserId not found in request']);
    }

    await this.authService.logout({ userId });
    this.logger.log(`Logout successful for user ID: ${userId}`);
  }

  @HttpCode(HttpStatus.OK)
  @Post('refresh-token')
  async refreshToken(
    @Body() refreshToken: RefreshTokenRequest,
  ): Promise<AccessTokenResponseDto> {
    this.logger.log('Refresh token attempt');

    const result = await this.authService.refreshAccessToken(refreshToken);
    this.logger.log('Refresh token successful');
    return result;
  }
}
