import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { AuthenticatedRequest } from 'src/auth/requests/authenticated-request';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private rateLimitMap = new Map<string, RateLimitEntry>();
  private readonly MAX_REQUESTS: number;
  private readonly TIME_WINDOW = 30 * 60 * 1000; // 30 minutos em milissegundos

  constructor() {
    // Lê do .env ou usa 100 como padrão
    this.MAX_REQUESTS = parseInt(process.env.CHATBOT_MAX_REQUESTS || '100', 10);
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = request.userId;

    if (!userId) {
      throw new HttpException(
        'Usuário não autenticado',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const now = Date.now();
    const userLimit = this.rateLimitMap.get(userId);

    // Se não existe entrada ou o tempo resetou, cria nova entrada
    if (!userLimit || now > userLimit.resetTime) {
      this.rateLimitMap.set(userId, {
        count: 1,
        resetTime: now + this.TIME_WINDOW,
      });
      return true;
    }

    // Se ainda está dentro do limite
    if (userLimit.count < this.MAX_REQUESTS) {
      userLimit.count++;
      return true;
    }

    // Limite excedido
    const resetIn = Math.ceil((userLimit.resetTime - now) / 1000 / 60); // minutos
    throw new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: `Limite de requisições excedido. Você pode fazer ${this.MAX_REQUESTS} requisições a cada 30 minutos. Tente novamente em ${resetIn} minutos.`,
        remainingTime: resetIn,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  // Método para limpar entradas antigas (opcional, para evitar memory leak)
  clearExpiredEntries(): void {
    const now = Date.now();
    for (const [userId, entry] of this.rateLimitMap.entries()) {
      if (now > entry.resetTime) {
        this.rateLimitMap.delete(userId);
      }
    }
  }
}
