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
    const { rawAnalysis } = input;
    const priority = rawAnalysis.priority as string;

    if (!priority) {
      throw new Error('Priority not found in raw analysis');
    }

    const validatedPriority = this.validatePriority(priority);

    return {
      priority: validatedPriority,
    };
  }

  private validatePriority(value: string): TicketPriority {
    if (!Object.values(TicketPriority).includes(value as TicketPriority)) {
      throw new Error(`Invalid priority: ${value}`);
    }
    return value as TicketPriority;
  }
}
