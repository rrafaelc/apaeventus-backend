import { HttpException } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';

// Mock do Google Generative AI
const mockGenerateContent = jest.fn();
const mockGetGenerativeModel = jest.fn(() => ({
  generateContent: mockGenerateContent,
}));

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: mockGetGenerativeModel,
  })),
}));

describe('ChatbotService', () => {
  let service: ChatbotService;

  beforeEach(() => {
    jest.clearAllMocks();

    // Define a variável de ambiente necessária
    process.env.GEMINI_API_KEY = 'test-api-key';

    service = new ChatbotService();
    service.onModuleInit();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('onModuleInit', () => {
    it('should initialize Google Generative AI with API key', () => {
      const newService = new ChatbotService();
      newService.onModuleInit();

      expect(mockGetGenerativeModel).toHaveBeenCalledWith({
        model: 'gemini-2.5-flash',
      });
    });

    it('should throw error when GEMINI_API_KEY is missing', () => {
      delete process.env.GEMINI_API_KEY;

      const newService = new ChatbotService();

      expect(() => newService.onModuleInit()).toThrow(
        'GEMINI_API_KEY não encontrada nas variáveis de ambiente',
      );

      // Restaura a variável de ambiente
      process.env.GEMINI_API_KEY = 'test-api-key';
    });
  });

  describe('generateEventSuggestions', () => {
    it('should generate first question for new conversation', async () => {
      const userId = 'user-123';
      const userMessage = 'Quero criar um evento de tecnologia';
      const expectedQuestion = 'Qual é o público-alvo deste evento?';

      mockGenerateContent.mockResolvedValue({
        response: { text: () => expectedQuestion },
      });

      const result = (await service.generateEventSuggestions(
        userId,
        userMessage,
      )) as any;

      expect(result.conversationComplete).toBe(false);
      expect(result.suggestions).toEqual([]);
      expect(result.message).toBe(expectedQuestion);
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it('should generate second question after first response', async () => {
      const userId = 'user-456';
      const firstMessage = 'Evento de tecnologia';
      const secondMessage = 'Para desenvolvedores';
      const expectedSecondQuestion = 'Qual será a temática principal?';

      mockGenerateContent
        .mockResolvedValueOnce({
          response: { text: () => 'Primeira pergunta' },
        })
        .mockResolvedValueOnce({
          response: { text: () => expectedSecondQuestion },
        });

      // Primeira interação
      await service.generateEventSuggestions(userId, firstMessage);

      // Segunda interação
      const result = (await service.generateEventSuggestions(
        userId,
        secondMessage,
      )) as any;

      expect(result.conversationComplete).toBe(false);
      expect(result.suggestions).toEqual([]);
      expect(result.message).toBe(expectedSecondQuestion);
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });

    it('should generate third question after second response', async () => {
      const userId = 'user-789';
      const messages = [
        'Evento de tecnologia',
        'Para desenvolvedores',
        'Sobre IA',
      ];
      const expectedThirdQuestion = 'Qual é o diferencial do evento?';

      mockGenerateContent
        .mockResolvedValueOnce({
          response: { text: () => 'Primeira pergunta' },
        })
        .mockResolvedValueOnce({
          response: { text: () => 'Segunda pergunta' },
        })
        .mockResolvedValueOnce({
          response: { text: () => expectedThirdQuestion },
        });

      // Três interações
      await service.generateEventSuggestions(userId, messages[0]);
      await service.generateEventSuggestions(userId, messages[1]);
      const result = (await service.generateEventSuggestions(
        userId,
        messages[2],
      )) as any;

      expect(result.conversationComplete).toBe(false);
      expect(result.suggestions).toEqual([]);
      expect(result.message).toBe(expectedThirdQuestion);
      expect(mockGenerateContent).toHaveBeenCalledTimes(3);
    });

    it('should generate final suggestions after third response', async () => {
      const userId = 'user-101';
      const messages = [
        'Evento de tecnologia',
        'Para desenvolvedores',
        'Sobre IA',
        'Networking e aprendizado',
      ];

      const mockSuggestions = [
        {
          title: 'Tech AI Summit 2025',
          description:
            'Evento focado em inteligência artificial para desenvolvedores, com workshops práticos e networking.',
        },
        {
          title: 'Conferência de IA e Inovação',
          description:
            'Explore as últimas tendências em IA com palestrantes renomados e sessões interativas.',
        },
        {
          title: 'Encontro Dev AI',
          description:
            'Conecte-se com profissionais da área de IA em um ambiente de aprendizado e troca de experiências.',
        },
      ];

      mockGenerateContent
        .mockResolvedValueOnce({
          response: { text: () => 'Primeira pergunta' },
        })
        .mockResolvedValueOnce({
          response: { text: () => 'Segunda pergunta' },
        })
        .mockResolvedValueOnce({
          response: { text: () => 'Terceira pergunta' },
        })
        .mockResolvedValueOnce({
          response: { text: () => JSON.stringify(mockSuggestions) },
        });

      await service.generateEventSuggestions(userId, messages[0]);
      await service.generateEventSuggestions(userId, messages[1]);
      await service.generateEventSuggestions(userId, messages[2]);
      const result = await service.generateEventSuggestions(
        userId,
        messages[3],
      );

      expect(result.conversationComplete).toBe(true);
      expect(result.suggestions).toEqual(mockSuggestions);
      expect(mockGenerateContent).toHaveBeenCalledTimes(4);
    });

    it('should reset conversation after timeout', async () => {
      const userId = 'user-timeout';
      const firstMessage = 'Evento de música';
      const secondMessage = 'Evento após timeout';

      mockGenerateContent
        .mockResolvedValueOnce({
          response: { text: () => 'Primeira pergunta' },
        })
        .mockResolvedValueOnce({
          response: { text: () => 'Pergunta após reset' },
        });

      // Primeira interação
      await service.generateEventSuggestions(userId, firstMessage);

      // Simula timeout manualmente alterando o timestamp
      const conversationState = service['conversationStates'].get(userId);
      if (conversationState) {
        conversationState.lastInteraction = Date.now() - 6 * 60 * 1000; // 6 minutos atrás
      }

      // Segunda interação após timeout
      const result = (await service.generateEventSuggestions(
        userId,
        secondMessage,
      )) as any;

      expect(result.conversationComplete).toBe(false);
      expect(result.message).toContain('conversa anterior expirou');
      expect(result.message).toContain('Pergunta após reset');
    });

    it('should handle invalid JSON response from AI', async () => {
      const userId = 'user-invalid-json';
      const messages = [
        'Evento de tecnologia',
        'Para desenvolvedores',
        'Sobre IA',
        'Networking',
      ];

      mockGenerateContent
        .mockResolvedValueOnce({
          response: { text: () => 'Primeira pergunta' },
        })
        .mockResolvedValueOnce({
          response: { text: () => 'Segunda pergunta' },
        })
        .mockResolvedValueOnce({
          response: { text: () => 'Terceira pergunta' },
        })
        .mockResolvedValueOnce({
          response: { text: () => 'Invalid JSON response' },
        });

      await service.generateEventSuggestions(userId, messages[0]);
      await service.generateEventSuggestions(userId, messages[1]);
      await service.generateEventSuggestions(userId, messages[2]);

      await expect(
        service.generateEventSuggestions(userId, messages[3]),
      ).rejects.toThrow(HttpException);
    });

    it('should handle AI API errors', async () => {
      const userId = 'user-error';
      const userMessage = 'Evento de tecnologia';

      mockGenerateContent.mockRejectedValue(new Error('API Error'));

      await expect(
        service.generateEventSuggestions(userId, userMessage),
      ).rejects.toThrow(HttpException);
    });

    it('should validate suggestions array has 3 elements', async () => {
      const userId = 'user-invalid-count';
      const messages = [
        'Evento de tecnologia',
        'Para desenvolvedores',
        'Sobre IA',
        'Networking',
      ];

      const mockInvalidSuggestions = [
        {
          title: 'Tech Summit',
          description: 'Evento de tecnologia',
        },
      ]; // Apenas 1 sugestão em vez de 3

      mockGenerateContent
        .mockResolvedValueOnce({
          response: { text: () => 'Primeira pergunta' },
        })
        .mockResolvedValueOnce({
          response: { text: () => 'Segunda pergunta' },
        })
        .mockResolvedValueOnce({
          response: { text: () => 'Terceira pergunta' },
        })
        .mockResolvedValueOnce({
          response: { text: () => JSON.stringify(mockInvalidSuggestions) },
        });

      await service.generateEventSuggestions(userId, messages[0]);
      await service.generateEventSuggestions(userId, messages[1]);
      await service.generateEventSuggestions(userId, messages[2]);

      await expect(
        service.generateEventSuggestions(userId, messages[3]),
      ).rejects.toThrow(HttpException);
    });

    it('should validate suggestions have required fields', async () => {
      const userId = 'user-missing-fields';
      const messages = [
        'Evento de tecnologia',
        'Para desenvolvedores',
        'Sobre IA',
        'Networking',
      ];

      const mockInvalidSuggestions = [
        { title: 'Tech Summit' }, // Falta description
        { title: 'AI Conference', description: 'Descrição' },
        { title: 'Dev Meetup', description: 'Descrição' },
      ];

      mockGenerateContent
        .mockResolvedValueOnce({
          response: { text: () => 'Primeira pergunta' },
        })
        .mockResolvedValueOnce({
          response: { text: () => 'Segunda pergunta' },
        })
        .mockResolvedValueOnce({
          response: { text: () => 'Terceira pergunta' },
        })
        .mockResolvedValueOnce({
          response: { text: () => JSON.stringify(mockInvalidSuggestions) },
        });

      await service.generateEventSuggestions(userId, messages[0]);
      await service.generateEventSuggestions(userId, messages[1]);
      await service.generateEventSuggestions(userId, messages[2]);

      await expect(
        service.generateEventSuggestions(userId, messages[3]),
      ).rejects.toThrow(HttpException);
    });

    it('should remove markdown code blocks from AI response', async () => {
      const userId = 'user-markdown';
      const messages = [
        'Evento de tecnologia',
        'Para desenvolvedores',
        'Sobre IA',
        'Networking',
      ];

      const mockSuggestions = [
        { title: 'Tech Summit', description: 'Evento de tecnologia' },
        { title: 'AI Conference', description: 'Conferência de IA' },
        { title: 'Dev Meetup', description: 'Encontro de devs' },
      ];

      const markdownResponse =
        '```json\n' + JSON.stringify(mockSuggestions) + '\n```';

      mockGenerateContent
        .mockResolvedValueOnce({
          response: { text: () => 'Primeira pergunta' },
        })
        .mockResolvedValueOnce({
          response: { text: () => 'Segunda pergunta' },
        })
        .mockResolvedValueOnce({
          response: { text: () => 'Terceira pergunta' },
        })
        .mockResolvedValueOnce({
          response: { text: () => markdownResponse },
        });

      await service.generateEventSuggestions(userId, messages[0]);
      await service.generateEventSuggestions(userId, messages[1]);
      await service.generateEventSuggestions(userId, messages[2]);
      const result = await service.generateEventSuggestions(
        userId,
        messages[3],
      );

      expect(result.conversationComplete).toBe(true);
      expect(result.suggestions).toEqual(mockSuggestions);
    });
  });

  describe('resetConversation', () => {
    it('should reset conversation state for user', async () => {
      const userId = 'user-reset';
      const userMessage = 'Evento de tecnologia';

      mockGenerateContent.mockResolvedValue({
        response: { text: () => 'Primeira pergunta' },
      });

      // Cria uma conversa
      await service.generateEventSuggestions(userId, userMessage);

      // Verifica que o estado existe
      expect(service['conversationStates'].has(userId)).toBe(true);

      // Reseta a conversa
      service.resetConversation(userId);

      // Verifica que o estado foi removido
      expect(service['conversationStates'].has(userId)).toBe(false);
    });
  });

  describe('conversation state management', () => {
    it('should maintain separate conversation states for different users', async () => {
      const user1 = 'user-1';
      const user2 = 'user-2';
      const message = 'Evento de tecnologia';

      mockGenerateContent.mockResolvedValue({
        response: { text: () => 'Pergunta' },
      });

      await service.generateEventSuggestions(user1, message);
      await service.generateEventSuggestions(user2, message);

      expect(service['conversationStates'].has(user1)).toBe(true);
      expect(service['conversationStates'].has(user2)).toBe(true);
      expect(service['conversationStates'].get(user1)).not.toBe(
        service['conversationStates'].get(user2),
      );
    });

    it('should update lastInteraction timestamp on each message', async () => {
      const userId = 'user-timestamp';
      const messages = ['Primeiro', 'Segundo'];

      mockGenerateContent.mockResolvedValue({
        response: { text: () => 'Pergunta' },
      });

      await service.generateEventSuggestions(userId, messages[0]);
      const firstTimestamp =
        service['conversationStates'].get(userId)?.lastInteraction;

      // Aguarda um pouco para garantir timestamps diferentes
      await new Promise((resolve) => setTimeout(resolve, 10));

      await service.generateEventSuggestions(userId, messages[1]);
      const secondTimestamp =
        service['conversationStates'].get(userId)?.lastInteraction;

      expect(secondTimestamp).toBeGreaterThan(firstTimestamp!);
    });

    it('should store user responses in conversation state', async () => {
      const userId = 'user-responses';
      const messages = ['Primeira resposta', 'Segunda resposta'];

      mockGenerateContent.mockResolvedValue({
        response: { text: () => 'Pergunta' },
      });

      await service.generateEventSuggestions(userId, messages[0]);
      await service.generateEventSuggestions(userId, messages[1]);

      const state = service['conversationStates'].get(userId);
      expect(state?.userResponses).toEqual(messages);
    });

    it('should increment questionsAsked counter correctly', async () => {
      const userId = 'user-counter';
      const messages = ['Primeira', 'Segunda', 'Terceira'];

      mockGenerateContent.mockResolvedValue({
        response: { text: () => 'Pergunta' },
      });

      await service.generateEventSuggestions(userId, messages[0]);
      expect(service['conversationStates'].get(userId)?.questionsAsked).toBe(1);

      await service.generateEventSuggestions(userId, messages[1]);
      expect(service['conversationStates'].get(userId)?.questionsAsked).toBe(2);

      await service.generateEventSuggestions(userId, messages[2]);
      expect(service['conversationStates'].get(userId)?.questionsAsked).toBe(3);
    });

    it('should clear conversation state after generating final suggestions', async () => {
      const userId = 'user-clear';
      const messages = ['Primeira', 'Segunda', 'Terceira', 'Quarta'];

      const mockSuggestions = [
        { title: 'Evento 1', description: 'Descrição 1' },
        { title: 'Evento 2', description: 'Descrição 2' },
        { title: 'Evento 3', description: 'Descrição 3' },
      ];

      mockGenerateContent
        .mockResolvedValueOnce({
          response: { text: () => 'Pergunta 1' },
        })
        .mockResolvedValueOnce({
          response: { text: () => 'Pergunta 2' },
        })
        .mockResolvedValueOnce({
          response: { text: () => 'Pergunta 3' },
        })
        .mockResolvedValueOnce({
          response: { text: () => JSON.stringify(mockSuggestions) },
        });

      await service.generateEventSuggestions(userId, messages[0]);
      await service.generateEventSuggestions(userId, messages[1]);
      await service.generateEventSuggestions(userId, messages[2]);

      expect(service['conversationStates'].has(userId)).toBe(true);

      await service.generateEventSuggestions(userId, messages[3]);

      expect(service['conversationStates'].has(userId)).toBe(false);
    });
  });
});
