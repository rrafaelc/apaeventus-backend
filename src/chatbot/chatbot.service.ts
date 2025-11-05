import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  HttpException,
  HttpStatus,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { ChatbotResponse, IChatbotService } from './interfaces/IChatbotService';

interface ConversationState {
  messages: Array<{ role: string; parts: Array<{ text: string }> }>;
  questionsAsked: number;
  userResponses: string[];
  lastInteraction: number; // Timestamp da última interação
}

@Injectable()
export class ChatbotService implements IChatbotService, OnModuleInit {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private conversationStates = new Map<string, ConversationState>();
  private readonly CONVERSATION_TIMEOUT = 5 * 60 * 1000; // 5 minutos em milissegundos

  onModuleInit() {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error(
        'GEMINI_API_KEY não encontrada nas variáveis de ambiente',
      );
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    // Usando gemini-2.5-flash - modelo estável mais recente (Junho 2025)
    // Alternativas: 'gemini-2.5-pro' (mais avançado) ou 'gemini-2.5-flash-lite' (mais rápido)
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }

  async generateEventSuggestions(
    userId: string,
    userMessage: string,
  ): Promise<ChatbotResponse> {
    try {
      // Pega ou cria o estado da conversa
      let conversationState = this.conversationStates.get(userId);

      const now = Date.now();

      // Verifica se existe conversa e se ela expirou (5 minutos de inatividade)
      if (conversationState) {
        const timeSinceLastInteraction =
          now - conversationState.lastInteraction;

        if (timeSinceLastInteraction > this.CONVERSATION_TIMEOUT) {
          // Conversa expirou, reseta e informa o usuário
          this.conversationStates.delete(userId);

          // Cria nova conversa e gera primeira pergunta
          const firstQuestion = await this.generateFirstQuestion(userMessage);

          const newConversationState: ConversationState = {
            messages: [],
            questionsAsked: 1,
            userResponses: [userMessage],
            lastInteraction: now,
          };
          this.conversationStates.set(userId, newConversationState);

          // Retorna mensagem informando que a conversa foi resetada
          return {
            suggestions: [],
            conversationComplete: false,
            message:
              'Sua conversa anterior expirou por inatividade (5 minutos). Vamos começar do zero! ' +
              firstQuestion,
          } as any;
        }
      }

      if (!conversationState) {
        conversationState = {
          messages: [],
          questionsAsked: 0,
          userResponses: [],
          lastInteraction: now,
        };
        this.conversationStates.set(userId, conversationState);
      }

      // Atualiza o timestamp da última interação
      conversationState.lastInteraction = now;

      // Adiciona a mensagem do usuário ao histórico
      conversationState.userResponses.push(userMessage);

      // Se ainda não fez perguntas suficientes (3 perguntas sobre tipo, detalhes e características)
      if (conversationState.questionsAsked < 3) {
        const nextQuestion = await this.generateNextQuestion(
          conversationState,
          userMessage,
        );
        conversationState.questionsAsked++;

        return {
          suggestions: [],
          conversationComplete: false,
          message: nextQuestion,
        } as any;
      }

      // Se já fez 3 perguntas, gera as sugestões finais
      const suggestions = await this.generateFinalSuggestions(
        conversationState.userResponses,
      );

      // Limpa o estado da conversa
      this.conversationStates.delete(userId);

      return {
        suggestions,
        conversationComplete: true,
      };
    } catch (error) {
      console.error('Erro no chatbot:', error);
      throw new HttpException(
        'Erro ao processar a mensagem. Tente novamente.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async generateFirstQuestion(userMessage: string): Promise<string> {
    const today = new Date();
    const todayStr = today.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const prompt = `Você é um assistente especializado em criar eventos. Um administrador precisa de ajuda para criar um título e descrição para um evento, mas não sabe por onde começar.

IMPORTANTE: Hoje é ${todayStr}.

O usuário disse: "${userMessage}"

Faça UMA pergunta curta e direta para entender melhor o evento que ele quer criar. Foque em descobrir o tipo de evento, público-alvo ou propósito principal. Seja breve e objetivo (máximo 2 frases).`;

    const result = await this.model.generateContent(prompt);
    const response = result.response;
    return response.text();
  }

  private async generateNextQuestion(
    conversationState: ConversationState,
    userMessage: string,
  ): Promise<string> {
    const questionNumber = conversationState.questionsAsked + 1;

    const today = new Date();
    const todayStr = today.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    let prompt = '';

    if (questionNumber === 1) {
      prompt = `Você é um assistente especializado em criar eventos. Um administrador precisa de ajuda para criar um título e descrição para um evento, mas não sabe por onde começar.

IMPORTANTE: Hoje é ${todayStr}.

O usuário disse: "${userMessage}"

Faça UMA pergunta curta e direta para entender melhor o evento que ele quer criar. Foque em descobrir o tipo de evento, público-alvo ou propósito principal. Seja breve e objetivo (máximo 2 frases).`;
    } else if (questionNumber === 2) {
      prompt = `Você está ajudando a criar um evento. Já temos essa informação:
Resposta 1: "${conversationState.userResponses[0]}"
Resposta 2: "${userMessage}"

Faça UMA segunda pergunta para complementar as informações. Foque em detalhes importantes como temática ou diferencial do evento. Seja breve e objetivo (máximo 2 frases).`;
    } else if (questionNumber === 3) {
      prompt = `Você está ajudando a criar um evento. Já temos essas informações sobre o tipo e características:
Resposta 1: "${conversationState.userResponses[0]}"
Resposta 2: "${conversationState.userResponses[1]}"
Resposta 3: "${userMessage}"

Faça UMA terceira e última pergunta para finalizar o entendimento do evento. Pergunte sobre algum aspecto importante que ainda não foi coberto. Seja breve e objetivo (máximo 2 frases).`;
    }

    const result = await this.model.generateContent(prompt);
    const response = result.response;
    return response.text();
  }

  private async generateFinalSuggestions(
    userResponses: string[],
  ): Promise<Array<{ title: string; description: string }>> {
    const prompt = `Você é um especialista em marketing de eventos. Com base nas informações abaixo, crie EXATAMENTE 3 sugestões diferentes de título e descrição para um evento.

Informações fornecidas:
1. Tipo/Categoria: ${userResponses[0]}
2. Detalhes: ${userResponses[1]}
3. Características: ${userResponses[2]}

Retorne APENAS um JSON válido no seguinte formato (sem markdown, sem \`\`\`json, apenas o JSON puro):
[
  {
    "title": "Título atrativo e curto (máximo 60 caracteres)",
    "description": "Descrição detalhada e envolvente do evento (entre 100-200 palavras)"
  },
  {
    "title": "Segundo título diferente",
    "description": "Segunda descrição com abordagem diferente"
  },
  {
    "title": "Terceiro título diferente",
    "description": "Terceira descrição com abordagem diferente"
  }
]

IMPORTANTE: 
- Retorne APENAS o JSON, sem texto adicional
- Crie títulos atrativos e profissionais
- Descrições devem ser completas, persuasivas e informativas
- Cada sugestão deve ter uma abordagem única`;

    const result = await this.model.generateContent(prompt);
    const response = result.response;
    let text = response.text().trim();

    // Remove markdown code blocks se existirem
    text = text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    try {
      const suggestions = JSON.parse(text);

      // Valida o formato
      if (!Array.isArray(suggestions) || suggestions.length !== 3) {
        throw new Error('Formato inválido');
      }

      // Valida se cada sugestão tem os campos necessários
      for (const suggestion of suggestions) {
        if (!suggestion.title || !suggestion.description) {
          throw new Error('Sugestão com campos faltando');
        }
      }

      return suggestions;
    } catch {
      console.error('Erro ao parsear resposta:', text);
      throw new HttpException(
        'Erro ao gerar sugestões. Tente novamente.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Método para resetar conversa manualmente (útil para testes)
  resetConversation(userId: string): void {
    this.conversationStates.delete(userId);
  }
}
