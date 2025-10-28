export class EventSuggestionDto {
  title: string;
  description: string;
}

export class EventSuggestionsResponseDto {
  suggestions: EventSuggestionDto[];
  conversationComplete: boolean;
  message?: string;
}
