import { Injectable } from '@nestjs/common';
import {
  AgentTool,
  AgentToolInput,
  AgentToolOutput,
} from '@application/ports/agent-tool.interface';
import { TicketCategory } from '@domain/enums/ticket-category.enum';

@Injectable()
export class TicketClassifierTool implements AgentTool {
  readonly name = 'TicketClassifierTool';

  async execute(input: AgentToolInput): Promise<AgentToolOutput> {
    return {
      category: input.rawAnalysis.category as TicketCategory,
    };
  }
}
