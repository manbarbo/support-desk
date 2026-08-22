import { Injectable } from '@nestjs/common';
import { AIProvider } from '@application/ports/ai-provider.interface';
import { Ticket } from '@domain/entities/ticket.entity';
import { TicketAnalysis } from '@domain/entities/ticket-analysis.entity';
import { TicketClassifierTool } from '@infrastructure/ai/tools/ticket-classifier.tool';
import { PriorityAnalyzerTool } from '@infrastructure/ai/tools/priority-analyzer.tool';
import { SentimentAnalyzerTool } from '@infrastructure/ai/tools/sentiment-analyzer.tool';
import { ResponseGeneratorTool } from '@infrastructure/ai/tools/response-generator.tool';
import { OpenCodeAdapter } from '@infrastructure/ai/opencode/opencode.adapter';

@Injectable()
export class SupportAgent implements AIProvider {
  constructor(
    private readonly openCodeAdapter: OpenCodeAdapter,
    private readonly classifierTool: TicketClassifierTool,
    private readonly priorityTool: PriorityAnalyzerTool,
    private readonly sentimentTool: SentimentAnalyzerTool,
    private readonly responseTool: ResponseGeneratorTool,
  ) {}

  async analyzeTicket(ticket: Ticket): Promise<TicketAnalysis> {
    // 1. Una sola llamada a la API (OpenCodeAdapter ahora expone este método)
    const rawAnalysis = await this.openCodeAdapter.getRawAnalysis(ticket);

    // 2. Ejecutar todas las tools en paralelo
    const [categoryResult, priorityResult, sentimentResult, responseResult] =
      await Promise.all([
        this.classifierTool.execute({ ticket, rawAnalysis }),
        this.priorityTool.execute({ ticket, rawAnalysis }),
        this.sentimentTool.execute({ ticket, rawAnalysis }),
        this.responseTool.execute({ ticket, rawAnalysis }),
      ]);

    // 3. Combinar resultados en TicketAnalysis
    const analysis: TicketAnalysis = {
      id: crypto.randomUUID(),
      ticketId: ticket.id,
      category: categoryResult.category as TicketAnalysis['category'],
      priority: priorityResult.priority as TicketAnalysis['priority'],
      sentiment: sentimentResult.sentiment as TicketAnalysis['sentiment'],
      confidence: responseResult.confidence as number,
      suggestedResponse: responseResult.suggestedResponse as string,
      createdAt: new Date(),
    };

    return analysis;
  }
}
