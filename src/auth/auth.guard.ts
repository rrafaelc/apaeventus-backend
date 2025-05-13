import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CustomRequest } from 'src/global/interfaces/custom-request.interface';
import { User } from 'src/user/entities/user';
import { JwtConstants } from './constants';
import { TokenPayload } from './dtos/token';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<CustomRequest>();

    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Access token not found');
    }

    try {
      const payload = await this.jwtService.verifyAsync<TokenPayload>(token, {
        secret: JwtConstants.secret,
      });

      request.user = payload as User;
    } catch {
      throw new UnauthorizedException('Invalid access token');
    }

    return true;
  }

  private extractTokenFromHeader(request: CustomRequest): string | undefined {
    const authorizationHeader = request.headers['authorization'] as string;

    if (authorizationHeader && typeof authorizationHeader === 'string') {
      const [type, token] = authorizationHeader.split(' ');

      if (type.toLowerCase() === 'bearer' && token) {
        return token;
      }

      return undefined;
    }

    return undefined;
  }
}
