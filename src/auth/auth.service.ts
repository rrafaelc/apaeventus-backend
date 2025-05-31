import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/database/prisma.service';
import { TokenService } from 'src/token/token.service';
import { UserService } from 'src/user/user.service';
import { AccessTokenResponseDto } from './dtos/access-token-response.dto';
import { LoginResponseDto } from './dtos/login-response.dto';
import { LoginDto } from './dtos/login.dto';
import { RefreshTokenDto } from './dtos/refresh-token.dto';
import { IAuthService } from './interfaces/IAuthService';

@Injectable()
export class AuthService implements IAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
    private readonly tokenService: TokenService,
  ) {}

  async login({ email, password }: LoginDto): Promise<LoginResponseDto> {
    const user = await this.userService.findByEmail(email);

    if (!user) throw new UnauthorizedException(['Invalid credentials']);

    if (!user.password)
      throw new UnauthorizedException(['Invalid credentials']);

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      throw new UnauthorizedException(['Invalid credentials']);
    }

    const accessToken = await this.tokenService.generateAccessToken(user);
    const refreshToken = await this.tokenService.generateRefreshToken(user);

    await this.prisma.user.update({
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
        role: user.role,
        rg: user.rg,
        cpf: user.cpf,
        cellphone: user.cellphone,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };
  }

  async refreshAccessToken({
    refreshToken,
  }: RefreshTokenDto): Promise<AccessTokenResponseDto> {
    try {
      const payload = await this.tokenService.verifyRefreshToken(refreshToken);
      const id = payload.id;

      const user = await this.userService.findById(id);

      if (!user || user.refreshToken !== refreshToken) {
        throw new UnauthorizedException(['Invalid refresh token']);
      }

      const newAccessToken = await this.tokenService.generateAccessToken(user);

      return {
        accessToken: newAccessToken,
      };
    } catch {
      throw new UnauthorizedException(['Invalid refresh token']);
    }
  }
}
