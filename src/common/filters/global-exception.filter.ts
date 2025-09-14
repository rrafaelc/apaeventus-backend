import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string | string[];
    let errorCode: string;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || exception.message;
        errorCode = responseObj.error || exception.constructor.name;
      } else {
        message = String(exceptionResponse);
        errorCode = exception.constructor.name;
      }
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      errorCode = 'InternalServerError';
    }

    // Log the exception with appropriate level
    const messageStr = Array.isArray(message)
      ? message.join(', ')
      : String(message);

    if (status >= 500) {
      // Server errors - log as error with stack trace for debugging
      this.logger.error(
        `${request.method} ${request.url} - ${status} ${errorCode}: ${messageStr}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else if (status >= 400) {
      // Client errors - log as warning without stack trace (clean logs)
      this.logger.warn(
        `${request.method} ${request.url} - ${status} ${errorCode}: ${messageStr}`,
      );
    }

    // Prepare response
    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: Array.isArray(message) ? message : [message],
      error: errorCode,
    };

    response.status(status).json(errorResponse);
  }
}
