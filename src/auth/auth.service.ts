import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/database/prisma.service';
import { TokenService } from 'src/token/token.service';
import { UserService } from 'src/user/user.service';
import { AccessTokenResponseDto } from './dtos/access-token-response.dto';
import { LoginResponseDto } from './dtos/login-response.dto';
import { LoginDto } from './dtos/login.dto';
import { LogoutDto } from './dtos/logout.dto';
import { RefreshTokenDto } from './dtos/refresh-token.dto';
import { IAuthService } from './interfaces/IAuthService';

@Injectable()
export class AuthService implements IAuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
    private readonly tokenService: TokenService,
  ) {}

  async login({ email, password }: LoginDto): Promise<LoginResponseDto> {
    this.logger.debug(`Attempting login for email: ${email}`);

    const user = await this.userService.findByEmail(email);

    if (!user) {
      this.logger.warn(`Login failed: User not found for email: ${email}`);
      throw new UnauthorizedException(['Invalid credentials']);
    }

    if (!user.password) {
      this.logger.warn(`Login failed: No password set for user: ${email}`);
      throw new UnauthorizedException(['Invalid credentials']);
    }

    this.logger.debug(`Comparing password for user: ${email}`);
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      this.logger.warn(`Login failed: Password mismatch for user: ${email}`);
      throw new UnauthorizedException(['Invalid credentials']);
    }

    this.logger.debug(`Generating tokens for user: ${email}`);
    const accessToken = await this.tokenService.generateAccessToken(user);
    const refreshToken = await this.tokenService.generateRefreshToken(user);

    this.logger.debug(`Updating refresh token in database for user: ${email}`);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken },
    });

    this.logger.log(`Login successful for user: ${email} (ID: ${user.id})`);

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

  async logout({ userId }: LogoutDto): Promise<void> {
    this.logger.debug(`Attempting logout for user ID: ${userId}`);

    const user = await this.userService.findById(userId);

    if (!user) {
      this.logger.warn(`Logout failed: User not found for ID: ${userId}`);
      throw new UnauthorizedException(['User not found']);
    }

    this.logger.debug(`Clearing refresh token for user: ${user.email}`);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: null },
    });

    this.logger.log(
      `Logout successful for user: ${user.email} (ID: ${userId})`,
    );
  }

  async refreshAccessToken({
    refreshToken,
  }: RefreshTokenDto): Promise<AccessTokenResponseDto> {
    this.logger.debug('Attempting to refresh access token');

    try {
      this.logger.debug('Verifying refresh token');
      const payload = await this.tokenService.verifyRefreshToken(refreshToken);
      const id = payload.id;

      this.logger.debug(`Finding user for token refresh, user ID: ${id}`);
      const user = await this.userService.findById(id);

      if (!user || user.refreshToken !== refreshToken) {
        this.logger.warn(`Invalid refresh token for user ID: ${id}`);
        throw new UnauthorizedException(['Invalid refresh token']);
      }

      this.logger.debug(`Generating new access token for user: ${user.email}`);
      const newAccessToken = await this.tokenService.generateAccessToken(user);

      this.logger.log(
        `Access token refreshed successfully for user: ${user.email}`,
      );

      return {
        accessToken: newAccessToken,
      };
    } catch (error) {
      this.logger.error('Failed to refresh access token', error.stack);
      throw new UnauthorizedException(['Invalid refresh token']);
    }
  }
}
