import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserResponseDto } from 'src/user/dtos/user.response.dto';
import { PrismaService } from '../prisma/prisma.service';
import { LoginResponseDto } from './dtos/login-response.dto';
import { SignInDto } from './dtos/sign-in.dto';
import { SignUpDto } from './dtos/sign-up.dto';
import { RefreshTokenPayload } from './dtos/token.dto';

const JwtConstants = {
  refreshSecret: 'your-refresh-token-secret',
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async signUp(data: SignUpDto): Promise<UserResponseDto> {
    const userAlreadyExists = await this.prismaService.user.findUnique({
      where: {
        email: data.email,
      },
    });

    if (userAlreadyExists) {
      throw new UnauthorizedException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await this.prismaService.user.create({
      data: {
        ...data,
        password: hashedPassword,
      },
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      refreshToken: user.refreshToken,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async signIn(data: SignInDto): Promise<LoginResponseDto> {
    const user = await this.prismaService.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatch = await bcrypt.compare(data.password, user.password);

    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = await this.jwtService.signAsync({
      id: user.id,
      email: user.email,
      name: user.name,
    });

    const refreshToken = await this.jwtService.signAsync(
      { id: user.id },
      { secret: JwtConstants.refreshSecret, expiresIn: '7d' },
    );

    await this.prismaService.user.update({
      where: { id: user.id },
      data: { refreshToken },
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

  async refreshAccessToken(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
        refreshToken,
        {
          secret: JwtConstants.refreshSecret,
        },
      );

      const user = await this.prismaService.user.findUnique({
        where: { id: payload.id },
      });

      if (!user || user.refreshToken !== refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const newAccessToken = await this.jwtService.signAsync({
        id: user.id,
        email: user.email,
        name: user.name,
      });

      return { accessToken: newAccessToken };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async revokeRefreshToken(userId?: string) {
    await this.prismaService.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
  }
}
