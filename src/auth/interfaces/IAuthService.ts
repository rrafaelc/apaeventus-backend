import { AccessTokenResponseDto } from '../dtos/access-token-response.dto';
import { FirstAccessDto } from '../dtos/first-access.dto';
import { LoginResponseDto } from '../dtos/login-response.dto';
import { SignInDto } from '../dtos/sign-in.dto';

export interface IAuthService {
  signIn(signInDto: SignInDto): Promise<LoginResponseDto>;
  refreshAccessToken(refreshToken: string): Promise<AccessTokenResponseDto>;
  revokeRefreshToken(userId: number): Promise<void>;
  firstAccess(firstAccessDto: FirstAccessDto): Promise<void>;
}
