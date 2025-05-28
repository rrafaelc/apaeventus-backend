import { AccessTokenResponseDto } from '../dtos/access-token-response.dto';
import { LoginResponseDto } from '../dtos/login-response.dto';
import { LoginDto } from '../dtos/login.dto';
import { RefreshTokenDto } from '../dtos/refresh-token.dto';

export interface IAuthService {
  login(loginDto: LoginDto): Promise<LoginResponseDto>;
  refreshAccessToken(
    refreshTokenDto: RefreshTokenDto,
  ): Promise<AccessTokenResponseDto>;
}
