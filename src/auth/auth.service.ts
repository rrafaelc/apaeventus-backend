import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { TokenService } from 'src/token/token.service';
import { UserService } from 'src/user/user.service';
import { PrismaService } from '../database/prisma.service';
import { AccessTokenResponseDto } from './dtos/access-token-response.dto';
import { LoginResponseDto } from './dtos/login-response.dto';
import { SignInDto } from './dtos/sign-in.dto';
import { IAuthService } from './interfaces/IAuthService';

@Injectable()
export class AuthService implements IAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
    private readonly tokenService: TokenService,
  ) {}

  async signIn({ email, password }: SignInDto): Promise<LoginResponseDto> {
    const user = await this.userService.findByEmail({ email });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = await this.tokenService.generateAccessToken(user.id);
    const refreshToken = await this.tokenService.generateRefreshToken(user.id);

    await this.userService.update({
      id: user.id,
      refreshToken,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        refreshToken: user.refreshToken,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };
  }

  async refreshAccessToken(
    refreshToken: string,
  ): Promise<AccessTokenResponseDto> {
    try {
      const payload = await this.tokenService.verifyRefreshToken(refreshToken);
      const id = payload.id;

      const user = await this.userService.findById({ id });

      if (!user || user.refreshToken !== refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const newAccessToken = await this.tokenService.generateAccessToken(
        user.id,
      );

      return {
        accessToken: newAccessToken,
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async revokeRefreshToken(userId: string): Promise<void> {
    await this.tokenService.revokeRefreshToken(userId);
  }
}
