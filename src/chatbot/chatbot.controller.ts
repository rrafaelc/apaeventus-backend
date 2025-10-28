import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { AuthenticatedRequest } from 'src/auth/requests/authenticated-request';
import { Roles } from 'src/user/decorators/roles.decorator';
import { RolesGuard } from 'src/user/guards/roles.guard';
import { ChatbotService } from './chatbot.service';
import { ChatMessageDto } from './dtos/chat-message.dto';
import { EventSuggestionsResponseDto } from './dtos/event-suggestion-response.dto';
import { RateLimitGuard } from './guards/rate-limit.guard';

@Controller('chatbot')
@UseGuards(AuthGuard, RolesGuard, RateLimitGuard)
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Post('generate-event')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async generateEventSuggestions(
    @Body() chatMessageDto: ChatMessageDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<EventSuggestionsResponseDto> {
    const userId = req.userId as string;

    const result = await this.chatbotService.generateEventSuggestions(
      userId,
      chatMessageDto.message,
    );

    return result as EventSuggestionsResponseDto;
  }

  @Post('reset-conversation')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  resetConversation(@Request() req: AuthenticatedRequest): { message: string } {
    const userId = req.userId as string;
    this.chatbotService.resetConversation(userId);

    return {
      message: 'Conversa resetada com sucesso',
    };
  }
}
