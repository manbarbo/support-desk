import { Injectable } from '@nestjs/common';
import {
  AgentTool,
  AgentToolInput,
  AgentToolOutput,
} from '@application/ports/agent-tool.interface';

@Injectable()
export class ResponseGeneratorTool implements AgentTool {
  readonly name = 'ResponseGeneratorTool';

  async execute(input: AgentToolInput): Promise<AgentToolOutput> {
    return {
      suggestedResponse: input.rawAnalysis.suggestedResponse as string,
      confidence: input.rawAnalysis.confidence as number,
    };
  }
}
