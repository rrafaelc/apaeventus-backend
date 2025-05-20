import { User } from 'generated/prisma';
import { TokenDto } from '../dtos/token.dto';

export interface ITokenService {
  generateAccessToken(user: User): Promise<string>;
  generateRefreshToken(user: User): Promise<string>;
  verifyAccessToken(token: string): Promise<TokenDto>;
  verifyRefreshToken(token: string): Promise<TokenDto>;
  revokeRefreshToken(userId: string): Promise<void>;
  revokeAllRefreshTokens(): Promise<void>;
  getUserIdFromAccessToken(token: string): Promise<string>;
  getUserIdFromRefreshToken(token: string): Promise<string>;
}
