import { Injectable } from '@nestjs/common';
import {
  AgentTool,
  AgentToolInput,
  AgentToolOutput,
} from '@application/ports/agent-tool.interface';
import { TicketSentiment } from '@domain/enums/ticket-sentiment.enum';

@Injectable()
export class SentimentAnalyzerTool implements AgentTool {
  readonly name = 'SentimentAnalyzerTool';

  async execute(input: AgentToolInput): Promise<AgentToolOutput> {
    const { rawAnalysis } = input;
    const sentiment = rawAnalysis.sentiment as string;

    if (!sentiment) {
      throw new Error('Sentiment not found in raw analysis');
    }

    const validatedSentiment = this.validateSentiment(sentiment);

    return {
      sentiment: validatedSentiment,
    };
  }

  private validateSentiment(value: string): TicketSentiment {
    if (!Object.values(TicketSentiment).includes(value as TicketSentiment)) {
      throw new Error(`Invalid sentiment: ${value}`);
    }
    return value as TicketSentiment;
  }
}
