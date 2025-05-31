import { AccessTokenResponseDto } from '../dtos/access-token-response.dto';
import { LoginResponseDto } from '../dtos/login-response.dto';
import { LoginDto } from '../dtos/login.dto';
import { LogoutDto } from '../dtos/logout.dto';
import { RefreshTokenDto } from '../dtos/refresh-token.dto';

export interface IAuthService {
  login(loginDto: LoginDto): Promise<LoginResponseDto>;
  logout(logoutDto: LogoutDto): Promise<void>;
  refreshAccessToken(
    refreshTokenDto: RefreshTokenDto,
  ): Promise<AccessTokenResponseDto>;
}
