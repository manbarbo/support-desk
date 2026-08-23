import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Ticket } from '@domain/entities/ticket.entity';
import { LOGGER } from '@infrastructure/logging/logger.interface';
import type { Logger } from '@infrastructure/logging/logger.interface';
import { OpenCodeResponseSchema } from './opencode-response.schema';

interface OpenCodeChatCompletionResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

@Injectable()
export class OpenCodeAdapter {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(
    private readonly configService: ConfigService,
    @Inject(LOGGER) private readonly logger: Logger,
  ) {
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

  async getRawAnalysis(ticket: Ticket): Promise<Record<string, unknown>> {
    this.logger.info('Starting AI analysis', {
      context: 'OpenCodeAdapter',
      ticketId: ticket.id,
      model: this.model,
    });

    const start = Date.now();
    const prompt = this.buildPrompt(ticket);
    const rawResponse = await this.callAPI(prompt);
    const duration = Date.now() - start;

    const validationResult = OpenCodeResponseSchema.safeParse(rawResponse);

    if (!validationResult.success) {
      this.logger.error('Invalid OpenCode response', {
        context: 'OpenCodeAdapter',
        ticketId: ticket.id,
        errors: validationResult.error.issues,
        rawResponse,
      });

      throw new Error(
        `Invalid OpenCode response: ${validationResult.error.message}`,
      );
    }

    this.logger.info('AI analysis completed', {
      context: 'OpenCodeAdapter',
      ticketId: ticket.id,
      category: validationResult.data.category,
      priority: validationResult.data.priority,
      sentiment: validationResult.data.sentiment,
      confidence: validationResult.data.confidence,
      duration,
    });

    return validationResult.data;
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

  private async callAPI(prompt: string): Promise<Record<string, unknown>> {
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
      this.logger.error('OpenCode API error', {
        context: 'OpenCodeAdapter',
        status: response.status,
        statusText: response.statusText,
      });
      throw new Error(
        `OpenCode API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as OpenCodeChatCompletionResponse;
    const content = data.choices[0]?.message.content;

    if (!content) {
      this.logger.error('OpenCode returned empty response', {
        context: 'OpenCodeAdapter',
      });
      throw new Error('OpenCode returned an empty response');
    }

    try {
      return JSON.parse(content) as Record<string, unknown>;
    } catch (error) {
      this.logger.error('Failed to parse OpenCode response', {
        context: 'OpenCodeAdapter',
        content,
      });
      throw new Error(`Failed to parse OpenCode response: ${content}`);
    }
  }
}
