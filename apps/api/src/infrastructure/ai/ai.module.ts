import { Module } from '@nestjs/common';
import { OpenCodeAdapter } from './opencode/opencode.adapter';
import { SupportAgent } from '@application/agents/support-agent';
import { TicketClassifierTool } from './tools/ticket-classifier.tool';
import { PriorityAnalyzerTool } from './tools/priority-analyzer.tool';
import { SentimentAnalyzerTool } from './tools/sentiment-analyzer.tool';
import { ResponseGeneratorTool } from './tools/response-generator.tool';
import { AI_PROVIDER } from '@application/ports/ai-provider.interface';

@Module({
  providers: [
    OpenCodeAdapter,
    TicketClassifierTool,
    PriorityAnalyzerTool,
    SentimentAnalyzerTool,
    ResponseGeneratorTool,
    SupportAgent,
    {
      provide: AI_PROVIDER,
      useExisting: SupportAgent,
    },
  ],
  exports: [AI_PROVIDER],
})
export class AIModule {}
