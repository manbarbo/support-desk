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
    return {
      sentiment: input.rawAnalysis.sentiment as TicketSentiment,
    };
  }
}
