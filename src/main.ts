import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

process.env.TZ = 'UTC';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    logger.log('Starting ApaEventus Backend application...');

    const app = await NestFactory.create(AppModule, {
      logger: ['log', 'error', 'warn', 'debug', 'verbose'],
    });

    app.useGlobalPipes(new ValidationPipe());
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.useGlobalInterceptors(new LoggingInterceptor());
    app.enableCors();

    const port = process.env.PORT ?? 3333;

    await app.listen(port);

    logger.log(`Application is running on port ${port}`);
    logger.log('ApaEventus Backend started successfully');
  } catch (error) {
    logger.error('Failed to start application', error.stack);
    process.exit(1);
  }
}

void bootstrap();
