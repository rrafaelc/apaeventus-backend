import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { TokenService } from 'src/token/token.service';
import { AuthenticatedRequest } from '../requests/authenticated-request';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly tokenService: TokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException(['Access token is required']);
    }

    try {
      const payload = await this.tokenService.verifyAccessToken(token);

      request.userId = payload.id;
      request.role = payload.role;
    } catch {
      throw new UnauthorizedException(['Invalid access token']);
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
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
