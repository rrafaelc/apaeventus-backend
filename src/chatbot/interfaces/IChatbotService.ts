export interface EventSuggestion {
  title: string;
  description: string;
}

export interface ChatbotResponse {
  suggestions: EventSuggestion[];
  conversationComplete: boolean;
}

export interface IChatbotService {
  generateEventSuggestions(
    userId: string,
    userMessage: string,
  ): Promise<ChatbotResponse>;
}
