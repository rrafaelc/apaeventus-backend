import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { TokenService } from 'src/token/token.service';
import { UserService } from 'src/user/user.service';
import { AccessTokenResponseDto } from './dtos/access-token-response.dto';
import { FirstAccessDto } from './dtos/first-access.dto';
import { LoginResponseDto } from './dtos/login-response.dto';
import { SignInDto } from './dtos/sign-in.dto';
import { IAuthService } from './interfaces/IAuthService';

@Injectable()
export class AuthService implements IAuthService {
  constructor(
    private readonly userService: UserService,
    private readonly tokenService: TokenService,
  ) {}

  async signIn({ email, password }: SignInDto): Promise<LoginResponseDto> {
    const user = await this.userService.findByEmail(email);

    if (!user) throw new UnauthorizedException(['Invalid credentials']);

    if (!user.password)
      throw new UnauthorizedException(['Invalid credentials']);

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      throw new UnauthorizedException(['Invalid credentials']);
    }

    const accessToken = await this.tokenService.generateAccessToken(user);
    const refreshToken = await this.tokenService.generateRefreshToken(user);

    await this.userService.update({
      id: user.id,
      refreshToken,
    });

    const addresses = await this.userService.findAllUserAddresses(user.id);

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
        refreshToken,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        addresses: addresses.map((address) => ({
          id: address.id,
          street: address.street,
          number: address.number,
          neighborhood: address.neighborhood,
          city: address.city,
          state: address.state,
          zipCode: address.zipCode,
        })),
      },
    };
  }

  async refreshAccessToken(
    refreshToken: string,
  ): Promise<AccessTokenResponseDto> {
    try {
      const payload = await this.tokenService.verifyRefreshToken(refreshToken);
      const id = payload.id;

      const user = await this.userService.findById(id);

      if (!user || user.refreshToken !== refreshToken) {
        throw new UnauthorizedException(['Invalid refresh token']);
      }

      const newAccessToken = await this.tokenService.generateAccessToken(user);

      return {
        accessToken: newAccessToken,
      };
    } catch {
      throw new UnauthorizedException(['Invalid refresh token']);
    }
  }

  async revokeRefreshToken(userId: number): Promise<void> {
    await this.tokenService.revokeRefreshToken(userId);
  }

  async firstAccess({ email, password }: FirstAccessDto): Promise<void> {
    const user = await this.userService.findByEmail(email);

    if (!user) throw new UnauthorizedException(['User not found']);

    if (user.password)
      throw new UnauthorizedException(['User already has a password']);

    const hashedPassword = await bcrypt.hash(password, 10);

    await this.userService.update({
      id: user.id,
      password: hashedPassword,
    });
  }
}
