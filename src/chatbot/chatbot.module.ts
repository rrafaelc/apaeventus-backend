import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { TokenService } from 'src/token/token.service';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { RateLimitGuard } from './guards/rate-limit.guard';

@Module({
  imports: [DatabaseModule],
  controllers: [ChatbotController],
  providers: [ChatbotService, TokenService, RateLimitGuard],
  exports: [ChatbotService],
})
export class ChatbotModule {}
