import { TokenDto } from '../dtos/token.dto';

export interface ITokenService {
  generateAccessToken(userId: string): Promise<string>;
  generateRefreshToken(userId: string): Promise<string>;
  verifyAccessToken(token: string): Promise<TokenDto>;
  verifyRefreshToken(token: string): Promise<TokenDto>;
  revokeRefreshToken(userId: string): Promise<void>;
  revokeAllRefreshTokens(): Promise<void>;
  getUserIdFromAccessToken(token: string): Promise<string>;
  getUserIdFromRefreshToken(token: string): Promise<string>;
}
