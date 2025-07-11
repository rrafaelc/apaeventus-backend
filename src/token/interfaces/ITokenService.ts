import { User } from '@prisma/client';
import { TokenDto } from '../dtos/token.dto';

export interface ITokenService {
  generateAccessToken(user: User): Promise<string>;
  generateRefreshToken(user: User): Promise<string>;
  verifyAccessToken(token: string): Promise<TokenDto>;
  verifyRefreshToken(token: string): Promise<TokenDto>;
}
