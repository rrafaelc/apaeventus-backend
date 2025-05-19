import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
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

  generateAccessToken(userId: string): Promise<string> {
    return this.jwtService.signAsync(
      { id: userId },
      {
        secret: JwtConstants.secret,
        expiresIn: JwtConstants.expiresIn,
      },
    );
  }

  generateRefreshToken(userId: string): Promise<string> {
    return this.jwtService.signAsync(
      { id: userId },
      {
        secret: JwtConstants.refreshSecret,
        expiresIn: JwtConstants.refreshExpiresIn,
      },
    );
  }

  verifyAccessToken(token: string): Promise<TokenDto> {
    return this.jwtService.verifyAsync(token, {
      secret: JwtConstants.secret,
    });
  }

  verifyRefreshToken(token: string): Promise<TokenDto> {
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
