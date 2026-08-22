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
    const { rawAnalysis } = input;
    const category = rawAnalysis.category as string;

    if (!category) {
      throw new Error('Category not found in raw analysis');
    }

    const validatedCategory = this.validateCategory(category);

    return {
      category: validatedCategory,
    };
  }

  private validateCategory(value: string): TicketCategory {
    if (!Object.values(TicketCategory).includes(value as TicketCategory)) {
      throw new Error(`Invalid category: ${value}`);
    }
    return value as TicketCategory;
  }
}
