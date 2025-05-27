import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { JwtConstants } from './constants/constants';
import { TokenDto } from './dtos/token.dto';
import { ITokenService } from './interfaces/ITokenService';

@Injectable()
export class TokenService implements ITokenService {
  constructor(private readonly jwtService: JwtService) {}

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
}
