import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Ticket } from '@domain/entities/ticket.entity';

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
export class OpenCodeAdapter {
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

  async getRawAnalysis(ticket: Ticket): Promise<Record<string, unknown>> {
    const prompt = this.buildPrompt(ticket);
    const response = await this.callAPI(prompt);

    return {
      category: response.category,
      priority: response.priority,
      sentiment: response.sentiment,
      confidence: response.confidence,
      suggestedResponse: response.suggestedResponse,
    };
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
      throw new Error(
        `OpenCode API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as OpenCodeChatCompletionResponse;
    const content = data.choices[0]?.message.content;

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
}
