import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserResponseDto } from 'src/user/dtos/user.response.dto';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { LoginResponseDto } from './dtos/login-response.dto';
import { SignInDto } from './dtos/sign-in.dto';
import { SignUpDto } from './dtos/sign-up.dto';
import { RefreshTokenRequest } from './requests/refresh-token.request';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  async signUp(@Body() signUpDto: SignUpDto): Promise<UserResponseDto> {
    return this.authService.signUp(signUpDto);
  }

  @Post('signin')
  async signIn(@Body() signInDto: SignInDto): Promise<LoginResponseDto> {
    return this.authService.signIn(signInDto);
  }
  @UseGuards(AuthGuard)
  @Get('profile')
  me(@Req() req: Request & { user?: UserResponseDto }): UserResponseDto {
    return req.user as UserResponseDto;
  }

  @Post('refresh-token')
  async refreshToken(@Body() { refreshToken }: RefreshTokenRequest) {
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
