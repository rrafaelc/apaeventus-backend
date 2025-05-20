import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from 'generated/prisma';
import { UserService } from 'src/user/user.service';
import { JwtConstants } from './constants/constants';
import { TokenDto } from './dtos/token.dto';
import { ITokenService } from './interfaces/ITokenService';

@Injectable()
export class TokenService implements ITokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
  ) {}

  async generateAccessToken(user: User): Promise<string> {
    return this.jwtService.signAsync(
      {
        id: user.id,
        role: user.role,
      },
      {
        secret: JwtConstants.secret,
        expiresIn: JwtConstants.expiresIn,
      },
    );
  }

  generateRefreshToken(user: User): Promise<string> {
    return this.jwtService.signAsync(
      {
        id: user.id,
        role: user.role,
      },
      {
        secret: JwtConstants.refreshSecret,
        expiresIn: JwtConstants.refreshExpiresIn,
      },
    );
  }

  async verifyAccessToken(token: string): Promise<TokenDto> {
    return this.jwtService.verifyAsync<TokenDto>(token, {
      secret: JwtConstants.secret,
    });
  }

  async verifyRefreshToken(token: string): Promise<TokenDto> {
    return this.jwtService.verifyAsync(token, {
      secret: JwtConstants.refreshSecret,
    });
  }

  async revokeRefreshToken(userId: string): Promise<void> {
    await this.userService.update({
      id: userId,
      refreshToken: null,
    });
  }

  revokeAllRefreshTokens(): Promise<void> {
    throw new Error('Method not implemented.');
  }

  getUserIdFromAccessToken(token: string): Promise<string> {
    throw new Error('Method not implemented.');
  }

  getUserIdFromRefreshToken(token: string): Promise<string> {
    throw new Error('Method not implemented.');
  }
}
