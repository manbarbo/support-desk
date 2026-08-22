import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AIProvider } from '@application/ports/ai-provider.interface';
import { Ticket } from '@domain/entities/ticket.entity';
import { TicketAnalysis } from '@domain/entities/ticket-analysis.entity';
import { TicketCategory } from '@domain/enums/ticket-category.enum';
import { TicketPriority } from '@domain/enums/ticket-priority.enum';
import { TicketSentiment } from '@domain/enums/ticket-sentiment.enum';

interface OpenCodeResponse {
  category: string;
  priority: string;
  sentiment: string;
  confidence: number;
  suggestedResponse: string;
}

interface OpenCodeChatCompletionResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

@Injectable()
export class OpenCodeAdapter implements AIProvider {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('AI_API_KEY');
    const baseUrl = this.configService.get<string>('AI_BASE_URL');
    const model = this.configService.get<string>('AI_MODEL');

    if (!apiKey || !baseUrl || !model) {
      throw new Error('AI configuration is incomplete');
    }

    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.model = model;
  }

  async analyzeTicket(ticket: Ticket): Promise<TicketAnalysis> {
    const prompt = this.buildPrompt(ticket);
    const response = await this.callAPI(prompt);
    return this.mapToTicketAnalysis(ticket.id, response);
  }

  private buildPrompt(ticket: Ticket): string {
    return `
Analyze the following support ticket and provide a structured analysis.

Ticket Title: ${ticket.title}
Ticket Description: ${ticket.description}

Provide your analysis in JSON format with the following structure:
{
  "category": "ORDER" | "BILLING" | "TECHNICAL" | "ACCOUNT" | "GENERAL",
  "priority": "LOW" | "MEDIUM" | "HIGH" | "URGENT",
  "sentiment": "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "FRUSTRATED" | "ANGRY",
  "confidence": <number between 0 and 1>,
  "suggestedResponse": "<suggested response to the customer>"
}

Respond ONLY with the JSON object, no additional text.
    `.trim();
  }

  private async callAPI(prompt: string): Promise<OpenCodeResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'system',
            content:
              'You are a support ticket analyzer. Always respond with valid JSON in the exact format requested.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenCode API error: ${response.statusText}`);
    }

    const data = (await response.json()) as OpenCodeChatCompletionResponse;
    const content = data.choices[0].message.content;

    if (!content) {
      throw new Error('OpenCode returned an empty response');
    }

    try {
      return JSON.parse(content) as OpenCodeResponse;
    } catch (error) {
      console.error('Failed to parse OpenCode response:', content, error);
      throw new Error(`Failed to parse OpenCode response: ${content}`);
    }
  }

  private mapToTicketAnalysis(
    ticketId: string,
    response: OpenCodeResponse,
  ): TicketAnalysis {
    this.validateResponseStructure(response);

    return {
      id: crypto.randomUUID(),
      ticketId,
      category: this.validateCategory(response.category),
      priority: this.validatePriority(response.priority),
      sentiment: this.validateSentiment(response.sentiment),
      confidence: this.validateConfidence(response.confidence),
      suggestedResponse: this.validateSuggestedResponse(
        response.suggestedResponse,
      ),
      createdAt: new Date(),
    };
  }

  private validateResponseStructure(response: OpenCodeResponse): void {
    const requiredFields: Array<keyof OpenCodeResponse> = [
      'category',
      'priority',
      'sentiment',
      'confidence',
      'suggestedResponse',
    ];

    for (const field of requiredFields) {
      if (!(field in response)) {
        throw new Error(`Missing required field in AI response: ${field}`);
      }
    }
  }

  private validateSuggestedResponse(value: string): string {
    if (!value || value.trim().length === 0) {
      throw new Error('Suggested response cannot be empty');
    }
    return value;
  }

  private validateCategory(value: string): TicketCategory {
    if (!Object.values(TicketCategory).includes(value as TicketCategory)) {
      throw new Error(`Invalid category: ${value}`);
    }
    return value as TicketCategory;
  }

  private validatePriority(value: string): TicketPriority {
    if (!Object.values(TicketPriority).includes(value as TicketPriority)) {
      throw new Error(`Invalid priority: ${value}`);
    }
    return value as TicketPriority;
  }

  private validateSentiment(value: string): TicketSentiment {
    if (!Object.values(TicketSentiment).includes(value as TicketSentiment)) {
      throw new Error(`Invalid sentiment: ${value}`);
    }
    return value as TicketSentiment;
  }

  private validateConfidence(value: number): number {
    if (typeof value !== 'number' || isNaN(value)) {
      throw new Error(`Invalid confidence: ${value}. Must be a valid number`);
    }
    if (value < 0 || value > 1) {
      throw new Error(`Invalid confidence: ${value}. Must be between 0 and 1`);
    }
    return value;
  }
}
