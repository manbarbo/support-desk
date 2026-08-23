import { Injectable } from '@nestjs/common';
import {
  AgentTool,
  AgentToolInput,
  AgentToolOutput,
} from '@application/ports/agent-tool.interface';
import { TicketPriority } from '@domain/enums/ticket-priority.enum';

@Injectable()
export class PriorityAnalyzerTool implements AgentTool {
  readonly name = 'PriorityAnalyzerTool';

  async execute(input: AgentToolInput): Promise<AgentToolOutput> {
    return {
      priority: input.rawAnalysis.priority as TicketPriority,
    };
  }
}
